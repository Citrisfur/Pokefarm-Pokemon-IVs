'use strict';

// todo: save pokemon inventory to notepad after entire field is checked and pokemon were added or removed
// todo: remove pokemon that get released, individually or by mass
// todo: part two: remove pokemon that get traded also
// auto remove function when seen in field
// which means todo: keep track of fields
// todo: compare ivs of pokemon
// todo: display ivs on side context menu
// possible todo: perfect iv display on other people's fields
// profit

var $ = unsafeWindow.$;
var inventory = [];
var fileIDs = [];

let button = $("<li data-name=\"IV Inventory\"><a title=\"Count Inventory\" style=\"cursor: pointer;\">"
	+ "<img src=\"https://pfq-static.com/img/navbar/dex.png\"> (...) Inventory </a></li>");
$("#announcements > ul > li.spacer").eq(0).before(button);


function updateInventoryCount() {
	$(button).find("a").contents().filter(function() {
		return (this.nodeType == 3);
	}).replaceWith(" (" + (inventory.length ? inventory.length : "...") + ") Inventory");
}


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
						updateInventoryCount();
						console.log(inventory);
						invResolve("inventory built");
					});
				} else {
					console.log("Inventory does not exist, creating...");
					new Promise((resolve, reject) => {
						unsafeWindow.ajax("fields/fieldlist", {
							uid: 0
						}).success((response) => {
							let totalFields = 4; // testing code
//							let totalFields = response.fields.length;
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
											pokemon["species"] = $(this).find(".icons").parent().text()
												.substring(10, $(this).find(".icons").parent().text().length - 1);

											let pokemonAttributes = [];
											$(this).find(".icons").children().each(function() {
												pokemonAttributes.push($(this).attr("title").substring(1, $(this).attr("title").length - 1));
											});

											pokemon["gender"] = pokemonAttributes.shift();
											pokemon["form"] = $(this)
												.find(".forme").length ? $(this).find(".forme").text().substring(7) : null;
											pokemon["attributes"] = pokemonAttributes;
											pokemon["nature"] = $(this).find(".item").prev().clone().children().remove().end()
												.text().substring(1);

											// if not sliced, 7-12 indexes are EVs
											let html_pokemonIVs = $(this).find("span[data-tooltip]").slice(0, 6);

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

								updateInventoryCount();
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


function waitForElm(selector) {
	return new Promise((resolve, reject) => {
		if ($(selector).length) {
			return resolve($(selector));
		}

		const observer = new MutationObserver(() => {
			if ($(selector).length) {
				observer.disconnect();
				resolve($(selector));
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		// for empty fields, mostly
		setTimeout(() => reject(null), 2000);
	});
}


// load inventory outside of field grab function since we only want to load it once
async function waitForInventory() {
	await loadInventory();
	fieldPokemonHandler();
}


var fieldPokemonIDs = {};
async function fieldPokemonHandler() {
	if (inventory.length) {
		// wait for previous field to unload
		// ideally this function would run after the pokefarm button's action is registered instead of this delay
		await new Promise(r => setTimeout(r, 500));
		// displays perfect iv count on pokemon in mass release list
		waitForElm('#field_field > .menu > label[data-menu="release"]').then((elm) => {
			elm.on("click", async () => {
				await waitForElm(".bulkpokemonlist > ul > li > label > .icons").then((elm) => {
					elm.each(function() {
						$(this).after('<p style="margin-block-start: unset; margin-block-end: 1pt; text-align: center;">'
							+ fieldPokemonIDs[$(this).parent().find("input").val()] + ' Perfect IVs</p>');
					});
				});
			});
		});

		try {
			await waitForElm("#field_field > div.field > .tooltip_content > .fieldmontip").then((fieldPokemonList) => {
				fieldPokemonIDs = {};
				fieldPokemonList.each(async function() {
					let fieldPokemonID = $(this).find("h3").eq(0).find("a").attr("href").slice(-5);
					let invPokemon = inventory.find(pokemon => pokemon.id === fieldPokemonID);

					if (!invPokemon) {
						console.log("pokemon with id " + fieldPokemonID + " was not found in inventory, adding...");
						await new Promise((resolve, reject) => {
							GM_xmlhttpRequest({
								method: 'GET',
								url: "https://pokefarm.com/summary/" + fieldPokemonID,
								onload: (response) => {
									resolve(response.responseText);
								},
								onerror: (error) => {
									reject(error);
								}
							});
						}).then((response, reject) => {
							let pokemon = {};
							pokemon["id"] = fieldPokemonID;
							let pokemonAttributes = [];
							$(response).find("#summary_col1 > div.party > div > div.name").children().each(function(index) {
								index ? pokemonAttributes.push($(this).attr("title").substring(1, $(this).attr("title").length - 1))
									: pokemonAttributes.push($(this).text());
							});

							pokemon["name"] = pokemonAttributes.shift();
							pokemon["species"] = $(response).find("#pkmnspecdata > p:nth-child(1) > a").text();
							pokemon["gender"] = pokemonAttributes.pop();
							pokemon["form"] = $(response).find("#pkmnspecdata > p:nth-child(1) > span").length ?
								$(response).find("#pkmnspecdata > p:nth-child(1) > span").text().substring(1,
								$(response).find("#pkmnspecdata > p:nth-child(1) > span").text().length - 1) : null;
							pokemon["attributes"] = pokemonAttributes;
							pokemon["nature"] = $(response)
								.find("#summary_col1 > div.party > div > div.extra > div.nature > b").text();

							let html_pokemonIVs = $(response)
								.find("#summary_col2 > div > div:nth-child(6) > table > tbody > tr:nth-child(2)")
								 .children().slice(1);

							let pokemonIVs = {};
							pokemonIVs["health"] = parseInt($(html_pokemonIVs[0]).text());
							pokemonIVs["attack"] = parseInt($(html_pokemonIVs[1]).text());
							pokemonIVs["defense"] = parseInt($(html_pokemonIVs[2]).text());
							pokemonIVs["special_attack"] = parseInt($(html_pokemonIVs[3]).text());
							pokemonIVs["special_defense"] = parseInt($(html_pokemonIVs[4]).text());
							pokemonIVs["speed"] = parseInt($(html_pokemonIVs[5]).text());
							pokemon["iv_total"] = parseInt($(html_pokemonIVs[6]).text());

							let pokemonPerfectIVs = 0;
							for (let iv in pokemonIVs) {
								if (pokemonIVs[iv] == 31) { ++pokemonPerfectIVs; }
							}

							pokemon["ivs"] = pokemonIVs;
							pokemon["perfect_ivs"] = pokemonPerfectIVs;

							invPokemon = pokemon;
							inventory.push(pokemon);
							updateInventoryCount();
						});
					}

					let color = "white";
					switch(invPokemon["perfect_ivs"]) {
						case 0:
							color = "red";
							break;
						case 1:
							color = "violet";
							break;
						case 5:
							color = "green";
							break;
						case 6:
							color = "gold";
					}

					$(this).parent().prev().children().eq(1).before(
						'<p style="display: unset; position: absolute; bottom: 0px; right: 0px; margin: 0px; background: #000000;'
							+ ' z-index: 1; color: ' + color + '";>' + invPokemon["perfect_ivs"] + '</p>');
					fieldPokemonIDs[fieldPokemonID] = invPokemon["perfect_ivs"];
				});
			});
		} catch (e) {}
		return;
	}
	return;
}


// adds click listeners to previous, next, and all field jump buttons
$('#field_nav > button:nth-child(1)').on("click", fieldPokemonHandler);
$('#field_nav > button:nth-child(2)').on("click", fieldPokemonHandler);
$('#field_nav > button:nth-child(3)').on("click", async () => {
	await waitForElm("#fieldjumpnav > li > button").then((elm) => {
		elm.each(function() {
			$(this).on("click", fieldPokemonHandler);
		});
	});
});

$(button).on("click", () => {
	let popup = confirm("WARNING!\n\nThis will remove and rebuild your inventory files (the PokemonInventory.json files)"
	+ " in your Pokefarm notepad. This should only be run if absolutely necessary.\n\nNote: If your inventory files are"
	+ " completely missing, the script will rebuild them automatically without the need to run this operation."
	+ " To do so, simply refresh the page.\n\nThe rebuild will take about a minute. Click OK to continue.");
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
		updateInventoryCount();
		waitForInventory();
	}
});

waitForInventory();
