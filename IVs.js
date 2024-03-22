'use strict';

var $ = unsafeWindow.$;
var username = $("#globaluserlink").text();
var inventory = {"fields": []};
var invButton = $("<li data-name=\"IV Inventory\"><a title=\"Count Inventory\" style=\"cursor: pointer;\">"
  + "<img src=\"https://pfq-static.com/img/navbar/dex.png\"> (...) Inventory </a></li>");

$("#announcements > ul > li.spacer").eq(0).before(invButton);

/*var consoleDiv = $('<div><b>Console</b></div>');
var consoleLog = $("<p></p>");
var pokemonInfoDiv = $('<div><p>Pokemon Info</p></div>');
waitForElm("#field_field > .menu").then(() => {
  waitForElm("#announcements > ul > li[data-name='QoL']").finally(() => {
    waitForElm("#field_field > div.field").then(() => {
      let flexDiv = $('<div style="display: flex;"></div>');
      let pokefarmField = $("#field_field");
      const backgroundCSS = $("#field_field").css("background");
      const borderCSS = $("#field_field").css("border");

      $(flexDiv).insertBefore("#field_field");
      $("#field_field").remove();

      consoleDiv.css("flex", "1 1 0px").css("background", backgroundCSS).css("border", borderCSS).css("margin", "16px").css("padding", "4px 18px");
      consoleDiv.children().after(consoleLog);
      pokefarmField.css("flex", "0 1 600px");
      pokemonInfoDiv.css("flex", "1 1 0px").css("background", backgroundCSS).css("border", borderCSS).css("margin", "16px").css("padding", "0 18px");
      flexDiv.append(consoleDiv);
      flexDiv.append(pokefarmField);
      flexDiv.append(pokemonInfoDiv);
    });
  });
});*/


function updateInventoryCount() {
  let totalPokemon = 0;
  for (let field of inventory.fields) {
    totalPokemon += field.pokemon.length;
  }

  $(invButton).find("a").contents().filter(function() {
    return (this.nodeType == 3);
  }).replaceWith(" (" + (totalPokemon ? totalPokemon : "...") + ") Inventory");
}


var fileIDs = [];
var totalFields = 1
function saveInventory(fieldIndex = -1) {
  return new Promise(async (resolve) => {
    // save full inventory
    // todo: have this also work if files already exist, just write over them
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
                  "content": JSON.stringify(inventory.fields.slice(fileNumber * 50 - 50, fileNumber * 50))
                }
              }).success(() => {
                console.log("Wrote inventory to PokemonInventory" + fileNumber + ".json");
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
            "content": JSON.stringify(inventory.fields.slice(lowerFieldIndex, upperFieldIndex))
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
    let inventoryFilePromiseList = [];
    await new Promise((resolve, reject) => {
      unsafeWindow.ajax("farm/notepad", {
        "directory": null
      }).success((response) => {
        $(response.html).find("a[data-file]").each(function(index) {
          if ($(this).text().slice(0, 16) == "PokemonInventory" && $(this).text().slice(-5) == ".json") {
            let fileID = $(this).data("file");
            fileIDs.push(fileID);

            inventoryFilePromiseList.push(new Promise((resolve, reject) => {
              unsafeWindow.ajax("farm/notepad", {
                "directory": null,
                "file": fileID
              }).success((response) => {
                $.merge(inventory.fields, JSON.parse($(response.html).find("textarea").text()));
                resolve();
              }).failure(() => {
                reject("ERROR: Could not load notepad inventory file ID " + fileID);
              });
            }));
          }
        });
        resolve("Loading inventory from user's inventory files...");
      }).failure(() => {
        reject("ERROR: Could not retrieve user's notepad files");
      });
    });

    if (inventoryFilePromiseList.length) {
      console.log(fileIDs.length + " inventory file(s) found...");
      Promise.all(inventoryFilePromiseList).then(() => {
        updateInventoryCount();
        console.log(inventory);
        resolve("Loaded inventory from user's notepad.");
      });
    } else {
      console.log("Inventory does not exist, creating...");
      let pokemonListPromiseList = [];
      await new Promise((resolve, reject) => {
        unsafeWindow.ajax("fields/fieldlist", {
          uid: 0
        }).success((response) => {
          totalFields = response.fields.length;
//          totalFields = 49; // testing line
//          response.fields = response.fields.slice(0, 49); // testing line
          inventory = {"fields": []};
          for (let [index, resField] of response.fields.entries()) {
            let field = {};
            field["id"] = resField.id;
            field["name"] = resField.name;
            // in ajax request fieldid is index and not resField id because in the field list fieldid is the
            // position they display in and no longer their actual field ids
            pokemonListPromiseList.push(new Promise((resolve, reject) => {
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
                  pokemon["OT"] = null; // not available on tooltip

                  fieldPokemon.push(pokemon);
                });
                field["pokemon"] = fieldPokemon;
                inventory.fields.push(field);
                console.log("Read Pokemon Field " + index + "/" + totalFields + "...");
                resolve("Read Pokemon Field " + index + "/" + totalFields + "...");
              }).failure(() => {
                reject("ERROR: Could not read Pokemon Field " + index);
              });
            }));
          };
          resolve("Retrieved user's field list...");
        }).failure(() => {
          reject("ERROR: Could not retrieve user's field list");
        });
      });

      Promise.all(pokemonListPromiseList).then(() => {
        saveInventory().then(() => {
          resolve("Built inventory from Pokefarm fields.");
        });
      });
    }
  });
}


var evoTrees = []
function getEvoTree(pokemonSpecies) {
  return new Promise((resolve, reject) => {
    if (evoTrees[pokemonSpecies]) {
      resolve("Evo line for the " + pokemonSpecies + " species already generated.");
    }

    let evoTree = [];
    unsafeWindow.ajax("dex/details", {
      "id": fieldSurvey.find(pokemon => pokemon[1] == pokemonSpecies)[0]
    }).success((response) => {
      if ($(response.html).find("div.evolutiontree").text().includes("is not known to evolve")) {
        evoTree.push(pokemonSpecies);
      } else {
        $($(response.html).find("div.evolutiontree")).find("span.name").each(function () {
          // if (!$(this).text().includes("Mega") && !$(this).text().includes("Totem")) { // might want this later
          if (!evoTree.includes($(this).text())) {
            evoTree.push($(this).text());
          }
        });
      }

      evoTrees[pokemonSpecies] = evoTree;
      resolve("Generated evo line for the " + pokemonSpecies + " species.");
    }).failure(() => {
      reject("ERROR: Could not generate evo line for the " + pokemonSpecies + " species.")
    });
  });
}


async function searchInventory(pokemonSpecies) {
  return new Promise((resolve) => {
    getEvoTree(pokemonSpecies).then(() => {
      let matchedPokemon = [];
      for (let evoSpecies of evoTrees[pokemonSpecies]) {
        let evoForm;
        if (evoSpecies.indexOf("[") != -1) {
          evoForm = evoSpecies.substring(evoSpecies.indexOf("[") + 1, evoSpecies.length - 1);
          evoSpecies = evoSpecies.substring(0, evoSpecies.indexOf("[") - 1);
        }

        for (let field of inventory.fields) {
          let matches = field.pokemon.filter(pokemon => pokemon.species == evoSpecies)
           .filter(pokemon => pokemon.form == evoForm);

          for (let match of matches) {
            matchedPokemon.push([field.name, match]);
          }
        }
      }
      resolve(matchedPokemon);
    });
  });
}


function waitForElm(selector, timeout = 2) {
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
    if (timeout) {
      setTimeout(() => reject(null), timeout * 1000);
    }
  });
}


var fieldName;
async function fieldHandler() {
  let previousElm = null;
  if (!fieldName) {
    fieldName = $("#field_nav > button:nth-child(3)").text();
  } else {
    await waitForElm("#field_nav > button:nth-child(3):disabled").then(async () => {
      await waitForElm("#field_nav > button:nth-child(3):not([disabled])").then((fieldNameButton) => {
        fieldName = fieldNameButton.text();
      });
    });
  }

  let invField = inventory.fields.find(field => field.name === fieldName);
  if (!invField) {
    let field = {};
    field["id"] = null;
    field["name"] = fieldName;
    field["pokemon"] = [];
    invField = field;
    inventory.fields.push(invField);
  }

  let fieldPokemonIDs = {};
  let fieldPokemonPromiseList = [];
  let inventoryUpdated = false;
  waitForElm("div.menu").then(() => {
    fieldPokemonIDs = {};
    $("#field_field > div.field > .tooltip_content > .fieldmontip").each(function() {;
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

            $(response).find("div.tlitem").each(function() {
              let tlEntry = $(this).text();
              if (tlEntry.includes("Adopted from the Shelter by")) {
                pokemon["OT"] = tlEntry.substring(28);
                return false;
              } else if (tlEntry.includes("Egg hatched by")) {
                pokemon["OT"] = tlEntry.substring(15);
                return false;
              } else if (tlEntry.includes("Traded with") && !tlEntry.includes("SYSTEM")) {
                pokemon["OT"] = $(this).find("a").text();
              }
            });

            if (!pokemon["OT"]) {
              console.log("Couldn't find OT, assuming player is");
              pokemon["OT"] = username;
            }

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
            + ' z-index: 1; color: ' + color + ';">' + invPokemon["perfect_ivs"] + '</p>');
        fieldPokemonIDs[fieldPokemonID] = invPokemon["perfect_ivs"];

        resolve("Retrieved data of field Pokemon " + invPokemon["id"]);
      }));
    });
    $("span.fieldmon > img.big").each((index, elm) => {
      $(elm).on("click", () => {
        //pokemonInfoDiv[0].innerHTML = $(elm).parent().next().children()[0].innerHTML;
        let fieldPokemonSpecies = $(elm).parent().next().find(".icons").parent().text().substring(10, $(elm).parent().next().find(".icons").parent().text().length - 1) + ($(elm).parent().next().find(".forme").length ? " [" + $(elm).parent().next().find(".forme").text().substring(7) + "]" : "");

        if (previousElm) {
          // ok find a way to slim this down good arceus
          // checks if the evo tree of this pokemon and the last pokemon are the same
          // this way it will not research until the user clicks on a new evo line
          // also does not work for different species on same evo line until species is clicked on for first time
          if (JSON.stringify(evoTrees[fieldPokemonSpecies]) == JSON.stringify(evoTrees[$(previousElm).parent().next().find(".icons").parent().text().substring(10, $(previousElm).parent().next().find(".icons").parent().text().length - 1) + ($(previousElm).parent().next().find(".forme").length ? " [" + $(previousElm).parent().next().find(".forme").text().substring(7) + "]" : "")])) {
            return;
          }
        }

        previousElm = elm;
        searchInventory(fieldPokemonSpecies).then(async (result) => {
          let surveyTotal = 0;
          for (let evoSpecies of evoTrees[fieldPokemonSpecies]) {
            let surveySpecies = fieldSurvey.find(pokemon => pokemon[1] == evoSpecies);
            if (surveySpecies) {
              surveyTotal += parseInt(surveySpecies[2]);
            }
          }

           console.log("Pokefarm reports " + surveyTotal + " Pokemon in the " + fieldPokemonSpecies + " evo line; I know of " + result.length + ":");
          //consoleLog.text("Pokefarm reports " + surveyTotal + " Pokemon in the " + fieldPokemonSpecies + " evo line; I know of " + result.length + ":\n" + consoleLog.text());

          // test for both genders [male, female], if genderless first is used
          let highestPerfectIVs = [[], []];
          for (let [field, pokemon] of result) {
            if (!highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].length || pokemon.perfect_ivs > highestPerfectIVs[pokemon.gender == "F" ? 1 : 0][0].perfect_ivs) {
              highestPerfectIVs[pokemon.gender == "F" ? 1 : 0] = [];
              highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].push(pokemon);
            } else if (pokemon.perfect_ivs == highestPerfectIVs[pokemon.gender == "F" ? 1 : 0][0].perfect_ivs) {
              highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].push(pokemon);
            }
          }

          let pokemonOTPromiseList = [];
          if (highestPerfectIVs[0].length != 1) {
            for (let tiePokemon of highestPerfectIVs[0]) {
              if (!tiePokemon.OT) {
                pokemonOTPromiseList.push(new Promise((resolve, reject) => {
                  GM_xmlhttpRequest({
                    method: 'GET',
                    url: "https://pokefarm.com/summary/" + tiePokemon.id,
                    onload: (response) => {
                      $(response.responseText).find("div.tlitem").each(function() {
                        let tlEntry = $(this).text();
                        if (tlEntry.includes("Adopted from the Shelter by")) {
                          tiePokemon["OT"] = tlEntry.substring(28);
                          return false;
                        } else if (tlEntry.includes("Egg hatched by")) {
                          tiePokemon["OT"] = tlEntry.substring(15);
                          return false;
                        } else if (tlEntry.includes("Traded with") && !tlEntry.includes("SYSTEM")) {
                          tiePokemon["OT"] = $(this).find("a").text();
                        }
                      });

                      if (!tiePokemon["OT"]) {
                        tiePokemon["OT"] = username;
                      }

                      resolve();
                    },
                    onerror: (error) => {
                      reject(error);
                    }
                  });
                }));
              }
            }
          }

          if (highestPerfectIVs[1].length != 1) {
            for (let tiePokemon of highestPerfectIVs[1]) {
              if (!tiePokemon.OT) {
                pokemonOTPromiseList.push(new Promise((resolve, reject) => {
                  GM_xmlhttpRequest({
                    method: 'GET',
                    url: "https://pokefarm.com/summary/" + tiePokemon.id,
                    onload: (response) => {
                      $(response.responseText).find("div.tlitem").each(function() {
                        let tlEntry = $(this).text();
                        if (tlEntry.includes("Adopted from the Shelter by")) {
                          tiePokemon["OT"] = tlEntry.substring(28);
                          return false;
                        } else if (tlEntry.includes("Egg hatched by")) {
                          tiePokemon["OT"] = tlEntry.substring(15);
                          return false;
                        } else if (tlEntry.includes("Traded with") && !tlEntry.includes("SYSTEM")) {
                          tiePokemon["OT"] = $(this).find("a").text();
                        }
                      });

                      if (!tiePokemon["OT"]) {
                        tiePokemon["OT"] = username;
                      }
                      resolve();
                    },
                    onerror: (error) => {
                      reject(error);
                    }
                  });
                }));
              }
            }
          }

          Promise.all(pokemonOTPromiseList).then(() => {
            let diffOTPokemon = [[], []];
            if (highestPerfectIVs[0].length != 1) {
              for (let tiePokemon of highestPerfectIVs[0]) {
                if (tiePokemon.OT != username) {
                  diffOTPokemon[0].push(tiePokemon);
                }
              }
            }

            if (highestPerfectIVs[1].length != 1) {
              for (let tiePokemon of highestPerfectIVs[1]) {
                if (tiePokemon.OT != username) {
                  diffOTPokemon[1].push(tiePokemon);
                }
              }
            }

            let highestIVTotal = [0, 0];
            if (diffOTPokemon[0].length != 1) {
              if (!diffOTPokemon[0].length) {
                diffOTPokemon[0] = highestPerfectIVs[0];
              }

              for (let tiePokemon of diffOTPokemon[0]) {
                if (!highestIVTotal[0] || tiePokemon.iv_total > highestIVTotal[0]) {
                  highestIVTotal[0] = tiePokemon.iv_total;
                }
              }
            }

            if (diffOTPokemon[1].length != 1) {
              for (let tiePokemon of diffOTPokemon[1]) {
                if (!diffOTPokemon[0].length) {
                  diffOTPokemon[0] = highestPerfectIVs[0];
                }

                if (!highestIVTotal[1] || tiePokemon.iv_total > highestIVTotal[1]) {
                  highestIVTotal[1] = tiePokemon.iv_total;
                }
              }
            }

            for (let [field, pokemon] of result) {
              let release = "✅";
              if (pokemon.attributes.length || pokemon.perfect_ivs == 6) {
                release = "❌";
                console.log("Special or 6IV");
              } else if (highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].find(tiePokemon => tiePokemon.id == pokemon.id)) {
                if (highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].length == 1) {
                  release = "❌";
                  console.log("Only highest IV");
                } else {
                  if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].find(diffOTPkm => diffOTPkm.id = pokemon.id)) {
                    if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].length == 1) {
                      release = "❌";
                      console.log("Only different OT");
                    } else {
                      if (pokemon.iv_total == highestIVTotal[pokemon.gender == "F" ? 1 : 0]) {
                        release = "❌";
                        console.log("Highest IV total");
                      }
                    }
                  }
                }
              }

              console.log(field
               + (pokemon.attributes.length ? "/" + pokemon.attributes[0] : "")
               + ": " + pokemon.species
               + (pokemon.form ? " [" + pokemon.form + "]" : "") + " [" + pokemon.gender + "] "
               + (pokemon.ivs.health == 31 ? pokemon.ivs.health : "**")  + "/"
               + (pokemon.ivs.attack == 31 ? pokemon.ivs.attack : "**")  + "/"
               + (pokemon.ivs.defense == 31 ? pokemon.ivs.defense : "**")  + "/"
               + (pokemon.ivs.special_attack == 31 ? pokemon.ivs.special_attack : "**")  + "/"
               + (pokemon.ivs.special_defense == 31 ? pokemon.ivs.special_defense : "**")  + "/"
               + (pokemon.ivs.speed == 31 ? pokemon.ivs.speed : "**")  + " "
               + pokemon.perfect_ivs + " = " + pokemon.iv_total + " " + release
               + (pokemon.OT ? " " + pokemon.OT : ""));


              if (pokemonOTPromiseList.length) { // if OTs were updated
                let newOTPokemon = highestPerfectIVs[0].find(diffOTPkm => diffOTPkm.id = pokemon.id);
                if (newOTPokemon) {
                  inventory.fields.find(invField => invField.name == field).pokemon.find(invPokemon => invPokemon.id == pokemon.id).OT = newOTPokemon.OT;
                }

                newOTPokemon = highestPerfectIVs[1].find(diffOTPkm => diffOTPkm.id = pokemon.id);
                if (newOTPokemon) {
                  inventory.fields.find(invField => invField.name == field).pokemon.find(invPokemon => invPokemon.id == pokemon.id).OT = newOTPokemon.OT;
                }

                inventoryUpdated = true;
              }
            }

            if (inventoryUpdated) {
              //saveInventory();
            }
          });
        });
      });
    });
  }).finally((e) => {
    Promise.all(fieldPokemonPromiseList).then(() => {
      for (var i = invField.pokemon.length - 1; i >= 0; i--) {
        if (!Object.keys(fieldPokemonIDs).includes(invField.pokemon[i].id)) {
          console.log("pokemon with id " + invField.pokemon[i].id
           + " was found in the inventory but not on the field, removing...");
          inventory.fields.find(field => field.name == invField.name).pokemon
           .splice(invField.pokemon.indexOf(invField.pokemon.find(pokemon => pokemon.id === invField.pokemon[i].id)), 1);
          inventoryUpdated = true;
        }
      }

      if (inventoryUpdated) {
        saveInventory(inventory.fields.indexOf(invField));
      };

      // displays perfect iv count on pokemon in mass release list
      waitForElm('#field_field > .menu > label[data-menu="release"]').then((elm) => {
        elm.on("click", () => {
          waitForElm(".bulkpokemonlist > ul > li > label > .icons").then((elm) => {
            elm.each(function() {
              let color = "white";
              switch(fieldPokemonIDs[$(this).parent().find("input").val()]) {
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

              $(this).after('<p style="margin-block-start: unset; margin-block-end: 1pt; text-align: center; color: '
                + color + ';">' + fieldPokemonIDs[$(this).parent().find("input").val()] + ' Perfect IVs</p>');
            });
          });
        });
      });
      waitForElm('#field_field > .menu > label[data-menu="research"]', 0).then((elm) => {
        elm.on("click", () => {
          waitForElm("#fieldjumpnav > li > button").then((elm) => {
            elm.each(function() {
              $(this).on("click", fieldHandler);
            });
          });
        });
      });
      waitForElm('#field_field > .menu > label[data-menu="search"]', 0).then((elm) => {
        elm.on("click", () => {
          waitForElm("#searchfieldsbox > form > p:nth-child(3) > input[type=submit]", 0).then((elm) => {
            elm.on("click", () => {
              waitForElm("#fieldjumpnav > li > button").then((elm) => {
                elm.each(function() {
                  $(this).on("click", fieldHandler);
                });
              }).catch(() => {});
            });
          });
        });
      });
    });
  });
}


var fieldSurvey;
loadInventory().then(async (result) => {
  console.log(result);
  await new Promise((resolve) => {
    unsafeWindow.ajax("fields/survey", {}).success((response) => {
      resolve(response.survey);
    });
  }).then((result) => {
    fieldSurvey = result;
  });

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
      inventory = {"fields": []};
      updateInventoryCount();
      loadInventory();
    }
  });
});
