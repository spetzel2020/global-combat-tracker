export const MODULE_NAME = "global-combat-tracker";
export const MODULE_VERSION = "0.1.0";
/*Global Combat Tracker
21-Nov-2020   0.1.0 Created
22-Nov-2020   0.1.0b Switch to a push model rather than pull (because otherwise we get caught in a render loop)
23-Nov-2020   0.1.0d: Now we need to echo the CT actions like:
              - roll initiative (should just copy from source for now)
              - advance turn (should duplicate - probably using a render hook)
23-Nov-2020   0.2.0: Switch to a new approach, bascially substituting a "Global Combat Tracker" for the standard one
              Use the render hooks to substitute the subclass GCT              



*/

class GlobalCombatTracker extends CombatTracker {
  /** @override */
  	initialize({combat=null, render=true}={}) {
      //override the core behavior of only looking for a combat from the current scene if combat===null

      if (combat === null) {
        const combats = game.combats.entities ?? [];
        combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;
      }
      super.initialize({combat, render});

    }





  static init() {
      game.settings.register(MODULE_NAME, "GCTVersion", {
        name: "version",
        hint: "",
        scope: "world",
        config: false,
        default: "0.2.0",
        type: String
      });
      game.settings.register(MODULE_NAME, "enableGCT", {
        name: game.i18n.localize("GCT.Setting.Enable.NAME"),
        hint: game.i18n.localize("GCT.Setting.Enable.HINT"),  //Synchronize Combat Trackers across scenes
        scope: "client",
        config: true,
        default: true,
        // onChange: value => {replaceBeginCombat(game.combat)},
        type: Boolean
      });

  }
  
  static setup() {

  }


  static getSceneControlButtons(buttons) {
      let tokenButton = buttons.find(b => b.name === "token")

      if (tokenButton && game.user.isGM) {
          tokenButton.tools.push({
              name: "simulate",
              title: game.i18n.localize("GCT.BasicControlsButton.TITLE"),
              icon: "fas fa-bolt",
              toggle: false,
              active: true,
              visible: game.user.isGM,
              onClick: () => GlobalCombatTracker.createPopout()
          });
      }
  }

  static createPopout() {
    const sidebarCT = ui.combat;

    //FIXME: FInd a way of checking for a previous popout
    const pop = new GlobalCombatTracker({
      id: `${sidebarCT.options.id}-popout`,
      classes: sidebarCT.options.classes.concat([["sidebar-popout"]]),
      popOut: true
    });
    pop._original = pop;

    pop.initialize({combat: null, render: true});
    pop.render(true);
  }

}//end class GlobalCombatTracker




Hooks.on("init", GlobalCombatTracker.init);
Hooks.on('setup', GlobalCombatTracker.setup);
Hooks.on('getSceneControlButtons', GlobalCombatTracker.getSceneControlButtons);

/*
function isCopy(td) {
  //Return true only if there is a true flag entry
//FIXME: If td is null, then also (for now) is a copy
  return !td || (td.flags && td.flags[MODULE_NAME] && td.flags[MODULE_NAME].isCopy);
}

Hooks.on('createCombatant', async (thisCombat, combatant, options, userId) => {
  if (!thisCombat || !combatant || !game.user.isGM || isCopy(combatant)) {return;}

  const gameCombats = game.combats;
  const viewedScene = game.scenes.viewed;
  //There are this combat, other combats (Encounters) in THIS scene, and then combats in other scenes
  const combatsInOtherScenes = gameCombats?.entities.filter(c => c.data.scene !== viewedScene._id);

  //Don't want to sync different encounters within the same scene
  //(unless we decide that's the way to show other scenes)
  console.log(`Combats in current scene ${viewedScene.name}:`);
  console.log(gameCombats?.entities.filter(c => c.data.scene === viewedScene._id));
  console.log(`Combats in other scenes:`);

  //Get full token data so we can include that (because the other combats won't be able to look it up)
  const fullToken = canvas.tokens?.objects?.children?.find(t => (t.id === combatant.tokenId));

  const tdDup = duplicate(fullToken.data);
  tdDup.flags[MODULE_NAME] = {isCopy : true, sourceTokenId : combatant.tokenId}
  tdDup.hidden = true;

  //Now push this tokenData into other combats if not already present
  for (const otherCombat of combatsInOtherScenes) {
    const otherScene = game.scenes.find(s => s._id === otherCombat.data.scene);
    console.log(otherCombat, otherScene);

    //found says it's already been copied (is there a small chance that tokenId might not be unique?? across 2 scenes)
    const found = otherCombat.turns.find(turn => ((turn.tokenId === tdDup._id) && isCopy(turn)));

    //Have to lift the toggleCombat code because a lot of it depends on having actual tokens
    if (!found) {await otherCombat.createCombatant(tdDup, {temporary : false});}
  }//end for other combat
});//end hook

Hooks.on("deleteCombatant", async (thisCombat, combatant, options, userId) => {
  //For now we don't allow you to delete a combatant if it's a copy - but for a true Global Combat Tracker we will need that
  if (!thisCombat || !combatant || !game.user.isGM  || isCopy(combatant)) {return;}

  const gameCombats = game.combats;
  const viewedScene = game.scenes.viewed;
  //There are this combat, other combats (Encounters) in THIS scene, and then combats in other scenes
  const combatsInOtherScenes = gameCombats?.entities.filter(c => c.data.scene !== viewedScene._id);

  //Now remove this combatant from other combats if there
  for (const otherCombat of combatsInOtherScenes) {
    const otherScene = game.scenes.find(s => s._id === otherCombat.data.scene);
    console.log(otherCombat, otherScene);

    //found says it's already been copied 
    const found = otherCombat.turns.find(turn => (turn.flags && (turn.flags[MODULE_NAME]?.sourceTokenId === combatant.tokenId) && isCopy(turn)));

    if (found) {await otherCombat.deleteCombatant(found._id);}
  }//end for other combat
});


 Hooks.on('renderCombatTrackerConfig', async (ctc, html) => {
   const data = {
     combatTrackerSimulate: game.settings.get(MODULE_NAME,"combatTrackerSimulate")
   };

   const simulateCombatCheckbox = await renderTemplate(
     'modules/combat-simulator/templates/combat-config.html',
     data
   );
   //JQuery: Set the height to auto to accomodate the new option and then add the simulateCombatCheckbox before the Submit button
   html.css({height: 'auto'}).find('button[name=submit]').before(simulateCombatCheckbox);
 });

 /**
  * Save the setting when closing the combat tracker config.
  */
 /*
 Hooks.on('closeCombatTrackerConfig', async ({form}) => {
   let combatTrackerSimulate = form.querySelector('#combatTrackerSimulate').checked;
   // Save the setting when closing the combat tracker setting.
   await game.settings.set(MODULE_NAME, "combatTrackerSimulate", combatTrackerSimulate);
 });
 */
