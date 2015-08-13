var request = require('request');
var cheerio = require('cheerio');
var rp = require('request-promise');
var async = require('async');
var mongoose = require('mongoose');

require("./connection");
require('./model');
var MusicNode = mongoose.model('MusicNode');

var page = 1

while(page < 6){
	var url = "http://www.whosampled.com/Kanye-West/samples/?sp=" + page;
	var songLinks = [];
	rp(url)
		.then(function(html){
			var $ = cheerio.load(html);
			coercedLinkArr = Array.prototype.slice.call($('.trackName'));
			coercedLinkArr.forEach(function(aSong){
				songLinks.push(aSong.children[0].attribs.href);
			})
		}, function(error){
			console.log(error)
			return;
		})
		.then(function(){
			var url2 = "http://www.whosampled.com"
			songLinks.forEach(function(aSongLink){
				var songNode = {
					producers: [],
					samplesCollection: []
				};
				var finalPageLink = [];
				rp(url2 + aSongLink)
					.then(function(html){
						var $ = cheerio.load(html);
						$(".bordered-list").each(function(i, elem){
							if(i === 0) {
								$(this).find(".sampleEntry .trackName").each(function(i, elem){
									finalPageLink.push($(this)["0"].attribs.href);
								})
							}
						});

						songNode.songName = $(".trackInfo").find("h1").text();
						var artistName = $(".trackInfo .trackArtists").text().split(" ");
						artistName.splice(0, 1);
						songNode.artistName = artistName.join(" ");

						songNode.album = $(".trackInfo .trackReleaseDetails").find("h3").text();
						songNode.recLabel = $(".trackInfo .trackReleaseDetails").find("h4").text();
						songNode.imgLink = "http://www.whosampled.com" + $(".trackImage").find("img").attr("src")
						$(".trackReleaseDetails").find("a").each(function(i, elem){
							songNode.producers.push($(this).text());
						});
					}, function(error){
						console.log(error);
					})
					.then(function(){
						async.map(finalPageLink, function(aPageLink, callback){
							var sampleNode = {
								producers: [],
								sampleElement: {},
								sampleAppearance: {}
							};

							rp(url2 + aPageLink)
								.then(function(html){
									var $ = cheerio.load(html);
									if(!songNode.songLink){
										songNode.songLink = $(".sampleVideoRight").first().find("iframe").attr("src");
										$("#sampleWrap_dest .sampleReleaseDetails").children().each(function(i, elem){
											if($("#sampleWrap_dest .sampleReleaseDetails").children().length === 2){
												if(i === 1) {
													var yrAlbumArr =  $(this).text().replace(/\s+/g, " ").split(" ");
													yrAlbumArr.splice(0, 1); yrAlbumArr.splice(yrAlbumArr.length - 1, 1); 
													songNode.year = yrAlbumArr.splice(yrAlbumArr.length - 1, 1).join("");
													songNode.recLabel = yrAlbumArr.join(" ");
												} 
											} else {
													var yrAlbumArr =  $(this).text().replace(/\s+/g, " ").split(" ");
													yrAlbumArr.splice(0, 1); yrAlbumArr.splice(yrAlbumArr.length - 1, 1); 
													songNode.year = yrAlbumArr.splice(yrAlbumArr.length - 1, 1).join("");
													songNode.recLabel = yrAlbumArr.join(" ");
												}
										});
										songNode.genre = $(".buyTrackContainer").first().next().children().last().find("a").text()
									}

									sampleNode.sampleElement.sampler = $(".sampleTitle").find("h2").text();
									sampleNode.genre = $(".buyTrackContainer").last().next().children().last().find("a").text();
									// if($(".buyTrackContainer").last().next.children().first() === "Producer:"){
									// 	console.log('TRUE');
									// 	// sampleNode.producers = 
									// 	// $(".buyTrackContainer").last().next.children().first().find("a").each(function(i, elem){
									// 	// 	sampleNode.producers.push($(this).text());
									// 	// });
									// } else {console.log("FALSE")}
									var artistName2 = $("#sampleWrap_source .sampleTrackArtists").text().split(" ");
									artistName2.splice(0, 1);
									sampleNode.artistName = artistName2.join(" ");
									// sampleNode.artistName = $("#sampleWrap_source .sampleTrackArtists").find("a").text();
									sampleNode.songName = $("#sampleWrap_source .trackName").text();
									$("#sampleWrap_source .sampleReleaseDetails").children().each(function(i, elem){
										if($("#sampleWrap_source .sampleReleaseDetails").children().length === 2){
											if(i === 0) {
												sampleNode.album = $(this).text();
											} 
											if(i === 1) {
												var yrAlbumArr =  $(this).text().replace(/\s+/g, " ").split(" ");
												yrAlbumArr.splice(0, 1); yrAlbumArr.splice(yrAlbumArr.length - 1, 1); 
												sampleNode.year = yrAlbumArr.splice(yrAlbumArr.length - 1, 1).join("");
												sampleNode.recLabel = yrAlbumArr.join(" ");
											}	
										} else{
												var yrAlbumArr =  $(this).text().replace(/\s+/g, " ").split(" ");
												yrAlbumArr.splice(0, 1); yrAlbumArr.splice(yrAlbumArr.length - 1, 1); 
												sampleNode.year = yrAlbumArr.splice(yrAlbumArr.length - 1, 1).join("");
												sampleNode.recLabel = yrAlbumArr.join(" ");
											}
									});

									$(".sampleTimingRight").each(function(i, elem){
										if(i === 0) sampleNode.sampleAppearance.sampler = $(this).text();
										else sampleNode.sampleAppearance.original = $(this).text();
									});

									sampleNode.imgLink = "http://www.whosampled.com" + $(".sampleTrackImage").find("img").attr("src");
									sampleNode.songLink = $(".sampleVideoRight").last().find("iframe").attr("src");

								}, function(error){
									console.log(error);
								})
								.then(function(){
								    callback(null, sampleNode);
								}, function(error){
								    console.log(error);
								})
						}, function(err, results){
							songNode.samplesCollection = results;
							MusicNode.create(songNode).then(function(newNode){
								console.log("success!");
							}, function(err){
								console.log(err)
							})
						})
					}, function(){
						throw new Error("it failed");
					})
			})
		}, function(){
			throw new Error("It failed");
		})

	
	page ++;
}