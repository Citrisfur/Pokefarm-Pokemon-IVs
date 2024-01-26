'use strict';

// todo: remove para from forms i.e. (Othrus)
// todo: add pokemon name to json
// todo: make gender its own key value pair instead of in attrs.
// todo: auto add in pokemon that aren't in inventory
// todo: compare ivs of pokemon
// todo: display ivs on field tooltips or side context menu
// profit

var $ = unsafeWindow.$;
var inventory = [];
var fileID = 0;

let button = $("<li data-name=\"IV Inventory\"><a title=\"Count Inventory\" style=\"cursor: pointer;\"><img src=\"https://pfq-static.com/img/navbar/dex.png\"> (...) Inventory </a></li>");
$("#announcements > ul > li.spacer").eq(0).before(button);

function loadInventory() {
	new Promise((resolve, reject) => {
		unsafeWindow.ajax("farm/notepad", {
			"directory": null
		}).success((response) => {
			console.log("Retrieved list of user's notepad files");

			$(response.html).find("a[data-file]").each(function(index) {
				if ($(this).text() == "PokemonInventory.json") {
					fileID = $(this).data("file");
					console.log("Inventory found!");

					new Promise((resolve, reject) => {
						unsafeWindow.ajax("farm/notepad", {
							"directory": null,
							"file": fileID
						}).success((response) => {
							inventory = JSON.parse($(response.html).find("textarea").text());
							console.log(inventory);
							$(button).find("a").contents().filter(function(){
								return (this.nodeType == 3);
							}).replaceWith(" (" + inventory.length + ") Inventory");
							resolve(response);
						}).failure((response) => {
							console.log("Error reading Pokemon Field " + i);
							reject(response);
						});
					});
					// may rewrite each function to add break here
				}
			});

			if (!fileID) {
				console.log("Inventory does not exist, creating...");
				new Promise((resolve, reject) => {
					unsafeWindow.ajax("fields/fieldlist", {
						uid: 0
					}).success((response) => {
						var numberOfFields = 5; // testing code
	//					var numberOfFields = response.fields.length;
						var pkmnListPromiseList = [];

						for (let i = 0; i < numberOfFields; i++) {
							pkmnListPromiseList.push(new Promise((resolve, reject) => {
								unsafeWindow.ajax("fields/pkmnlist", {
									"fieldid": i,
									"tooltip": "train"
								}).success((response) => {
									console.log("Retrieved Pokemon Field " + i + "/" + numberOfFields);
									$(response.html).find(".fieldmontip").each(function() {
										var pokemon = {};
										pokemon["species"] = $(this).find(".icons").parent().text().substring(10, $(this).find(".icons").parent().text().length - 1);
										pokemon["form"] = $(this).find(".forme").length != 0 ? "(" + $(this).find(".forme").text().substring(7) + ")" : null;

										var pokemonAttributes = [];
										$(this).find("img[title]").each(function() {
											pokemonAttributes.push($(this).attr("title"));
										});

										pokemon["attributes"] = pokemonAttributes;

										var html_pokemonIVs = $(this).find(".tooltip_content").parent().find("span").slice(0,6); // if not sliced 7-12 indexes are evs
										var pokemonIVs = {};
										pokemonIVs["health"] = parseInt($(html_pokemonIVs[0]).text());
										pokemonIVs["attack"] = parseInt($(html_pokemonIVs[1]).text());
										pokemonIVs["defence"] = parseInt($(html_pokemonIVs[2]).text());
										pokemonIVs["special_attack"] = parseInt($(html_pokemonIVs[3]).text());
										pokemonIVs["special_defence"] = parseInt($(html_pokemonIVs[4]).text());
										pokemonIVs["speed"] = parseInt($(html_pokemonIVs[5]).text());

										var pokemonPerfectIVs = 0;
										var pokemonIVTotal = 0;
										for (var x = 0; x < html_pokemonIVs.length; ++x){
											if ($(html_pokemonIVs[x]).text() == "31") { ++pokemonPerfectIVs; }
											pokemonIVTotal += parseInt($(html_pokemonIVs[x]).text());
										}

										pokemon["perfect_ivs"] = pokemonPerfectIVs;
										pokemon["ivs"] = pokemonIVs;
										pokemon["iv_total"] = pokemonIVTotal;
										pokemon["nature"] = $(this).find(".item").prev().clone().children().remove().end().text().substring(1);
										inventory.push(pokemon);
									});
									resolve(response);
								}).failure((response) => {
									console.log("Error reading Pokemon Field " + i);
									reject(response);
								});
							}));
						}

						pkmnListPromiseList[numberOfFields-1].then(function() {
							console.log("Read all Pokemon fields and built inventory");
							console.log(inventory);
							new Promise((resolve, reject) => {
								unsafeWindow.ajax("farm/notepad", {
									"directory": "",
									"mode": "newfile",
									"save": {
										"name": "PokemonInventory.json"
									}
								}).success((response) => {
									fileID = $($(response.html)[1]).data("fileform");
									console.log("Created file PokemonInventory.json in user's notepad");
									new Promise((resolve, reject) => {
										unsafeWindow.ajax("farm/notepad", {
											"file": fileID,
											"mode": "save",
											"save": {
												"name": "PokemonInventory.json",
												"content": JSON.stringify(inventory)
											}
										}).success((response) => {
											console.log("Wrote inventory to PokemonInventory.json");
											resolve(response);
										}).failure((response) => {
											console.log("Error reading Pokemon field list");
											reject(response);
										});
									});
									resolve(response);
								}).failure((response) => {
									console.log("Error creating PokemonInventory.json file");
									reject(response);
								});
							});
							$(button).find("a").contents().filter(function(){
								return (this.nodeType == 3);
							}).replaceWith(" (" + inventory.length + ") Inventory");
						});
						resolve(response);
					}).failure((response) => {
						console.log("Error reading Pokemon field list");
						reject(response);
					});
				});
			}
		}).failure((response) => {
			console.log("Error reading user's notepad directory");
			reject(response);
		});
	});
}

loadInventory();

$(button).on("click", () => {
	let popup = confirm("WARNING!\n\nThis will remove and rebuild your current inventory file (PokemonInventory.json) in your Pokefarm notepad. This should only be run if absolutely necessary.\n\nNote: If your inventory file is missing, the script will rebuild it automatically without the need to run this operation. To do so, simply refresh this page.\n\nThe rebuild will take longer the more Pokemon you own (about a minute per 3k Pokemon). Click OK to continue.");
	if (popup) {
		new Promise((resolve, reject) => {
			unsafeWindow.ajax("farm/notepad", {
				"mode": "command",
				"command": "delete",
				"operands": {
					"type": "file",
					"id": fileID
				}
			}).success((response) => {
				console.log("Deleted current PokemonInventory.json");
				resolve(response);
			}).failure((response) => {
				console.log("Error deleting file PokemonInventory.json");
				reject(response);
			});
		});
		fileID = 0;
		inventory = [];
		$(button).find("a").contents().filter(function(){
			return (this.nodeType == 3);
		}).replaceWith(" (...) Inventory");
		loadInventory();
	}
});
