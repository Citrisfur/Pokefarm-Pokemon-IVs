'use strict';

// todo: auto add in pokemon that aren't in inventory
// todo: compare ivs of pokemon
// todo: display ivs on field tooltips or side context menu
// profit

var $ = unsafeWindow.$;
var inventory = [];
var fileIDs = [];

let button = $("<li data-name=\"IV Inventory\"><a title=\"Count Inventory\" style=\"cursor: pointer;\"><img src=\"https://pfq-static.com/img/navbar/dex.png\"> (...) Inventory </a></li>");
$("#announcements > ul > li.spacer").eq(0).before(button);

function loadInventory() {
	return new Promise((invResolve) => {
		new Promise((resolve, reject) => {
			unsafeWindow.ajax("farm/notepad", {
				"directory": null
			}).success((response) => {
				console.log("Retrieved list of user's notepad files");

				let inventoryFilePromiseList = [];
				$(response.html).find("a[data-file]").each(function(index) {
					if ($(this).text().slice(0, 16) == "PokemonInventory" && $(this).text().slice(-5) == ".json") {
						let fileID = $(this).data("file");
						fileIDs.push(fileID);

						inventoryFilePromiseList.push(new Promise((resolve, reject) => {
							unsafeWindow.ajax("farm/notepad", {
								"directory": null,
								"file": fileID
							}).success((response) => {
								$.merge(inventory, JSON.parse($(response.html).find("textarea").text()));
								resolve(response);
							}).failure((response) => {
								console.log("Error loading notepad inventory file " + fileIDs.length);
								reject(response);
							});
						}));
					}
				});

				if (inventoryFilePromiseList.length) {
					console.log(inventoryFilePromiseList.length + " inventory file(s) found...");
					inventoryFilePromiseList.slice(-1)[0].then(function() {
						$(button).find("a").contents().filter(function(){
							return (this.nodeType == 3);
						}).replaceWith(" (" + inventory.length + ") Inventory");
						console.log(inventory);
						invResolve("inventory built");
					});
				} else {
					console.log("Inventory does not exist, creating...");
					new Promise((resolve, reject) => {
						unsafeWindow.ajax("fields/fieldlist", {
							uid: 0
						}).success((response) => {
	//						let totalFields = 10; // testing code
							let totalFields = response.fields.length;
							let pkmnListPromiseList = [];
							for (let fieldID = 0; fieldID < totalFields; fieldID++) {
								pkmnListPromiseList.push(new Promise((resolve, reject) => {
									unsafeWindow.ajax("fields/pkmnlist", {
										"fieldid": fieldID,
										"tooltip": "train"
									}).success((response) => {
										console.log("Retrieved Pokemon Field " + (fieldID + 1) + "/" + totalFields);
										$(response.html).find(".fieldmontip").each(function() {
											let pokemon = {};
											pokemon["id"] = $(this).find("h3").eq(0).find("a").attr("href").slice(-5);
											pokemon["name"] = $(this).find("h3").eq(0).text();
											pokemon["species"] = $(this).find(".icons").parent().text().substring(10, $(this).find(".icons").parent().text().length - 1);

											let pokemonAttributes = [];
											$(this).find(".icons").children().each(function() {
												pokemonAttributes.push($(this).attr("title").substring(1, $(this).attr("title").length - 1));
											});

											pokemon["gender"] = pokemonAttributes.shift();
											pokemon["form"] = $(this).find(".forme").length != 0 ? $(this).find(".forme").text().substring(7) : null;
											pokemon["attributes"] = pokemonAttributes;
											pokemon["nature"] = $(this).find(".item").prev().clone().children().remove().end().text().substring(1);

											let html_pokemonIVs = $(this).find("span[data-tooltip]").slice(0,6); // if not sliced 7-12 indexes are evs

											let pokemonIVs = {};
											pokemonIVs["health"] = parseInt($(html_pokemonIVs[0]).text());
											pokemonIVs["attack"] = parseInt($(html_pokemonIVs[1]).text());
											pokemonIVs["defense"] = parseInt($(html_pokemonIVs[2]).text());
											pokemonIVs["special_attack"] = parseInt($(html_pokemonIVs[3]).text());
											pokemonIVs["special_defense"] = parseInt($(html_pokemonIVs[4]).text());
											pokemonIVs["speed"] = parseInt($(html_pokemonIVs[5]).text());

											let pokemonPerfectIVs = 0;
											let pokemonIVTotal = 0;
											for (let x = 0; x < html_pokemonIVs.length; ++x){
												if ($(html_pokemonIVs[x]).text() == "31") { ++pokemonPerfectIVs; }
												pokemonIVTotal += parseInt($(html_pokemonIVs[x]).text());
											}

											pokemon["ivs"] = pokemonIVs;
											pokemon["iv_total"] = pokemonIVTotal;
											pokemon["perfect_ivs"] = pokemonPerfectIVs;

											inventory.push(pokemon);
										});
										resolve(response);
									}).failure((response) => {
										console.log("Error reading Pokemon Field " + fieldID);
										reject(response);
									});
								}));
							}

							pkmnListPromiseList.slice(-1)[0].then(function() {
								console.log("Read all Pokemon fields and built inventory");

								for (let fileNumber = 1; fileNumber <= Math.ceil(inventory.length / 2000); fileNumber++) {
									new Promise((resolve, reject) => {
										unsafeWindow.ajax("farm/notepad", {
											"directory": "",
											"mode": "newfile",
											"save": {
												"name": "PokemonInventory" + fileNumber + ".json"
											}
										}).success((response) => {
											let fileID = $($(response.html)[1]).data("fileform");
											fileIDs.push(fileID);
											console.log("Created file PokemonInventory" + fileNumber + ".json in user's notepad");
											new Promise((resolve, reject) => {
												unsafeWindow.ajax("farm/notepad", {
													"file": fileID,
													"mode": "save",
													"save": {
														"name": "PokemonInventory" + fileNumber + ".json",
														"content": JSON.stringify(inventory.slice(fileNumber * 2000 - 2000, fileNumber * 2000))
													}
												}).success((response) => {
													console.log("Wrote inventory to PokemonInventory" + fileNumber + ".json");
													resolve(response);
												}).failure((response) => {
													console.log("Error reading Pokemon field list");
													reject(response);
												});
											});
											resolve(response);
										}).failure((response) => {
											console.log("Error creating file PokemonInventory" + fileNumber + ".json");
											reject(response);
										});
									});
								}

								$(button).find("a").contents().filter(function(){
									return (this.nodeType == 3);
								}).replaceWith(" (" + inventory.length + ") Inventory");

								console.log(inventory);
								invResolve("inventory built");
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
	});
}

$(button).on("click", () => {
	let popup = confirm("WARNING!\n\nThis will remove and rebuild your inventory files (PokemonInventoryN.json) in your Pokefarm notepad. This should only be run if absolutely necessary.\n\nNote: If your inventory files are missing, the script will rebuild them automatically without the need to run this operation. To do so, simply refresh this page.\n\nThe rebuild will take longer the more Pokemon you own and the busier the site is. Click OK to continue.");
	if (popup) {
		for (let fileID of fileIDs) {
			new Promise((resolve, reject) => {
				unsafeWindow.ajax("farm/notepad", {
					"mode": "command",
					"command": "delete",
					"operands": {
						"type": "file",
						"id": fileID
					}
				}).success((response) => {
					console.log("Deleted a PokemonInventory.json file");
					resolve(response);
				}).failure((response) => {
					console.log("Error deleting a PokemonInventory.json file");
					reject(response);
				});
			});
		}
		fileIDs = [];
		inventory = [];
		$(button).find("a").contents().filter(function(){
			return (this.nodeType == 3);
		}).replaceWith(" (...) Inventory");
		loadInventory();
	}
});


var grabFieldPokemonInterval = 0;
async function waitForInventory() {
	await loadInventory();
	grabFieldPokemon();
	// Don't like this, maybe can change later to check if user changes fields
	grabFieldPokemonInterval = setInterval(grabFieldPokemon, 5000);
}


function grabFieldPokemon() {
	let fieldPokemonList = $("div.field div.fieldmontip");
	if (fieldPokemonList.length) {
		console.log(fieldPokemonList);

		let fieldPokemonIDs = [];
		fieldPokemonList.each(function() {
			let fieldPokemonID = $(this).find("h3").eq(0).find("a").attr("href").slice(-5);
			fieldPokemonIDs.push(fieldPokemonID);
			let found = false;
			for (let pokemon of inventory) {
				if (fieldPokemonID == pokemon["id"]) {
					console.log("pokemon with id " + fieldPokemonID + " found in inventory");
					found = true;
					break;
				}
			}
			if (!found) {
				console.log("pokemon with id " + fieldPokemonID + " was not found in inventory, adding...");
			}
		});

		console.log(fieldPokemonIDs);
	} else {
		console.log("didn't find any pokemon");
	}
	return;
}

waitForInventory();
