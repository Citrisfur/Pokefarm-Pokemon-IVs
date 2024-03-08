'use strict';

var $ = unsafeWindow.$;
var inventory = [];
var invButton = $("<li data-name=\"IV Inventory\"><a title=\"Count Inventory\" style=\"cursor: pointer;\">"
  + "<img src=\"https://pfq-static.com/img/navbar/dex.png\"> (...) Inventory </a></li>");

$("#announcements > ul > li.spacer").eq(0).before(invButton);


function updateInventoryCount() {
  let totalPokemon = 0;
  for (let field of inventory) {
    totalPokemon += field.pokemon.length;
  }

  $(invButton).find("a").contents().filter(function() {
    return (this.nodeType == 3);
  }).replaceWith(" (" + (totalPokemon ? totalPokemon : "...") + ") Inventory");
}


var fileIDs = [];
var totalFields = 1
function saveInventory(fieldIndex = -1) {
  console.log("Saving inventory to user's notepad...");
  return new Promise(async (resolve) => {
    // save full inventory
    if (fieldIndex == -1) {
      for (let fileNumber = 1; fileNumber <= Math.ceil(totalFields / 50); fileNumber++) {
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
            new Promise((resolve, reject) => {
              unsafeWindow.ajax("farm/notepad", {
                "file": fileID,
                "mode": "save",
                "save": {
                  "name": "PokemonInventory" + fileNumber + ".json",
                  "content": JSON.stringify(inventory.slice(fileNumber * 50 - 50, fileNumber * 50))
                }
              }).success(() => {
                resolve("Wrote inventory to PokemonInventory" + fileNumber + ".json");
              }).failure(() => {
                reject("ERROR: Could not write to file PokemonInventory" + fileNumber + ".json");
              });
            });
            resolve("Created new file PokemonInventory" + fileNumber + ".json in user's notepad");
          }).failure(() => {
            reject("ERROR: Could not create file PokemonInventory" + fileNumber + ".json");
          });
        });
      }
    } else {
      if (!fileIDs[Math.floor(fieldIndex / 50)]) {
        await new Promise((resolve, reject) => {
          unsafeWindow.ajax("farm/notepad", {
            "directory": "",
            "mode": "newfile",
            "save": {
              "name": "PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json"
            }
          }).success((response) => {
            let fileID = $($(response.html)[1]).data("fileform");
            fileIDs.push(fileID);
            resolve("Created new file PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json in user's notepad");
          }).failure(() => {
            reject("ERROR: Could not create file PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json");
          });
        });
      }

      let lowerFieldIndex = fieldIndex % 50 ? Math.floor(fieldIndex / 50) * 50 : fieldIndex;
      let upperFieldIndex = fieldIndex % 50 ? Math.ceil(fieldIndex / 50) * 50 : fieldIndex + 50;
      new Promise((resolve, reject) => {
        unsafeWindow.ajax("farm/notepad", {
          "file": fileIDs[Math.floor(fieldIndex / 50)],
          "mode": "save",
          "save": {
            "name": "PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json",
            "content": JSON.stringify(inventory.slice(lowerFieldIndex, upperFieldIndex))
          }
        }).success(() => {
          resolve("Wrote inventory to PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json");
        }).failure(() => {
          reject("ERROR: Could not write to file PokemonInventory" + (Math.floor(fieldIndex / 50) + 1) + ".json");
        });
      });
    }

    updateInventoryCount();
    console.log(inventory);
    resolve("Inventory saved.");
  });
}


async function loadInventory() {
  return new Promise(async (resolve) => {
    let lastInventoryFilePromise;
    await new Promise((resolve, reject) => {
      unsafeWindow.ajax("farm/notepad", {
        "directory": null
      }).success((response) => {
        $(response.html).find("a[data-file]").each(function(index) {
          if ($(this).text().slice(0, 16) == "PokemonInventory" && $(this).text().slice(-5) == ".json") {
            let fileID = $(this).data("file");
            fileIDs.push(fileID);

            lastInventoryFilePromise = new Promise((resolve, reject) => {
              unsafeWindow.ajax("farm/notepad", {
                "directory": null,
                "file": fileID
              }).success((response) => {
                $.merge(inventory, JSON.parse($(response.html).find("textarea").text()));
                resolve();
              }).failure(() => {
                reject("ERROR: Could not load notepad inventory file ID " + fileID);
              });
            });
          }
        });
        resolve("Loading inventory from user's inventory files...");
      }).failure(() => {
        reject("ERROR: Could not retrieve user's notepad files");
      });
    });

    if (lastInventoryFilePromise) {
      console.log(fileIDs.length + " inventory file(s) found...");
      lastInventoryFilePromise.then(() => {
        updateInventoryCount();
        resolve("Loaded inventory from user's notepad.");
        console.log(inventory);
      });
    } else {
      console.log("Inventory does not exist, creating...");
      let lastPokemonListPromise;
      await new Promise((resolve, reject) => {
        unsafeWindow.ajax("fields/fieldlist", {
          uid: 0
        }).success((response) => {
          totalFields = response.fields.length;
//          totalFields = 49; // testing line
//          response.fields = response.fields.slice(0, 49); // testing line
          for (let [index, resField] of response.fields.entries()) {
            let field = {};
            field["id"] = resField.id;
            field["name"] = resField.name;
            // in ajax request fieldid is index and not resField id because in the field list fieldid is the
            // position they display in and no longer their actual field ids
            lastPokemonListPromise = new Promise((resolve, reject) => {
              unsafeWindow.ajax("fields/pkmnlist", {
                "fieldid": index,
                "tooltip": "train"
              }).success((response) => {
                let fieldPokemon = [];
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

                  fieldPokemon.push(pokemon);
                });
                field["pokemon"] = fieldPokemon;
                inventory.push(field);
                resolve("Read Pokemon Field " + index + "/" + totalFields + "...");
              }).failure(() => {
                reject("ERROR: Could not read Pokemon Field " + index);
              });
            });
          };
          resolve("Retrieved user's field list...");
        }).failure(() => {
          reject("ERROR: Could not retrieve user's field list");
        });
      });

      lastPokemonListPromise.then(async () => {
        await saveInventory();
        resolve("Built inventory from Pokefarm fields.");
      });
    }
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


var fieldName;
async function fieldHandler() {
  if (!fieldName) {
    fieldName = $("#field_nav > button:nth-child(3)").text();
  } else {
    await waitForElm("#field_nav > button:nth-child(3):disabled").then(() => {
      waitForElm("#field_nav > button:nth-child(3):not([disabled])").then((fieldNameButton) => {
        fieldName = fieldNameButton.text();
      });
    });
  }

  let fieldPokemonIDs = {};
  // test if try catch block is needed here for empty field
  waitForElm("#field_field > div.field > .tooltip_content > .fieldmontip").then((fieldPokemonList) => {
    fieldPokemonIDs = {};
    let inventoryUpdated = false;
    let fieldPokemonPromiseList = [];
    let invField = inventory.find(field => field.name === fieldName);
    if (!invField) {
      let field = {};
      field["id"] = null;
      field["name"] = fieldName;
      field["pokemon"] = [];
      invField = field;
      inventory.push(invField);
    }

    fieldPokemonList.each(function() {
      fieldPokemonPromiseList.push(new Promise(async (resolve, reject) => {
        let fieldPokemonID = $(this).find("h3").eq(0).find("a").attr("href").slice(-5);
        let invPokemon = invField.pokemon.find(pokemon => pokemon.id === fieldPokemonID);
        inventoryUpdated = inventoryUpdated || !invPokemon;

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
          }).then((response) => {
            let pokemon = {};
            pokemon["id"] = fieldPokemonID;
            let pokemonAttributes = [];
            $(response).find("#summary_col1 > div.party > div > div.name").children().each(function(index) {
              pokemonAttributes.push(index ? $(this).attr("title").substring(1, $(this).attr("title").length - 1)
                : $(this).text());
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
            invField.pokemon.push(pokemon);
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
        resolve();
      }));
    });

    Promise.all(fieldPokemonPromiseList).then(() => {
      for (let invPokemon of invField.pokemon) {
        if (!Object.keys(fieldPokemonIDs).includes(invPokemon.id)) {
          console.log("pokemon with id " + invPokemon.id
            + " was found in the inventory but not on the field, removing...");
          inventory.find(field => field.name == invField.name).pokemon
            .splice(invField.pokemon.indexOf(invField.pokemon.find(pokemon => pokemon.id === invPokemon.id)), 1);
          inventoryUpdated = true;
        }
      }

      if (inventoryUpdated) {
        saveInventory(inventory.indexOf(invField));
      });
    }
  });

  // displays perfect iv count on pokemon in mass release list
  waitForElm('#field_field > .menu > label[data-menu="release"]').then((elm) => {
    elm.on("click", () => {
      waitForElm(".bulkpokemonlist > ul > li > label > .icons").then((elm) => {
        elm.each(function() {
          $(this).after('<p style="margin-block-start: unset; margin-block-end: 1pt; text-align: center;">'
            + fieldPokemonIDs[$(this).parent().find("input").val()] + ' Perfect IVs</p>');
        });
      });
    });
  });
  return;
}


loadInventory().then((result) => {
  console.log(result);
  fieldHandler();
  // adds click listeners to previous, next, and all field jump buttons
  $('#field_nav > button:nth-child(1)').on("click", fieldHandler);
  $('#field_nav > button:nth-child(2)').on("click", fieldHandler);
  $('#field_nav > button:nth-child(3)').on("click", () => {
    waitForElm("#fieldjumpnav > li > button").then((elm) => {
      elm.each(function() {
        $(this).on("click", fieldHandler);
      });
    });
  });

  // for now, waits for inventory to load to avoid race conditions from trying to delete the file while it's building
  // possible todo: change this to not have to wait for inv load but cancels that ongoing process if clicked
  $(invButton).on("click", () => {
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
          }).success(() => {
            resolve("Deleted a PokemonInventory.json file");
          }).failure(() => {
            reject("WARNING: Failed to delete a PokemonInventory.json file (may not exist)");
          });
        });
      }
      fileIDs = [];
      inventory = [];
      updateInventoryCount();
      loadInventory();
    }
  });
});
