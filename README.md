Read Me to be written - please visit the forum post here for full details: https://pokefarm.com/forum/thread/425427

A script written to enchance the player's PokeFarm experience: "The basics of the script are that it makes an "Inventory" of all the Pokemon in your fields, saves that inventory in your notepad, and uses it to compare the Pokemon you have against each other to suggest to you whether or not you should release them or keep them!"

"If you'd like to try it out, you'll need TamperMonkey and to be playing on Desktop - then create a new script, copy everything in the Release.js file from its GitHub, save, and test it out on your private fields page (pokefarm.com/fields).

QoL is not required for this script to work properly; that being said, as a player I recommend it all the same. PPIVs should work regardless of whether you have QoL enabled or disabled.

If installed properly, the script should create a "Pokemon Info" tab below your fields, which updates with information as you use the script. The first time you visit your fields, it will generate and save the inventory it will need to your notepad. Afterwards, each Pokemon's perfect IV count should appear over their respective sprites on the field. Clicking on a Pokemon will search the species evolution line and report in the Pokemon Info tab the best Male/Female pair you have and all of your Pokemon in the species, then of those which it recommends you release.

Whenever you visit a field in which a Pokemon has updated (such as adding or removing from that field, renaming, evolving, or changing the forms of), the script should detect it and update the inventory accordingly.

The mass release tab should also list the perfect IV count of all the Pokemon in the field (planning to add the ability to toggle that off in a future release).
    
The announcements bar should now include an Inventory button: it will report a number in the parenthesis with the amount of Pokemon saved in the inventory. If instead there are ellipsis (...), the inventory is either not loaded or in the process of being built. Check the Pokemon Info tab for its status.
    
Clicking on the Inventory button will open the settings menu for PPIVs, to include more features later. Right now there exists a "reset" button; clicking on this will rebuild the inventory in case of any problems. However, generally you don't want to do this if you don't have to: again, the inventory should auto update when you visit each field."
