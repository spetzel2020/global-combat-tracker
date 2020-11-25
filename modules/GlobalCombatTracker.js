export const MODULE_NAME = "global-combat-tracker";
export const MODULE_VERSION = "0.2.0";
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




  /** @override */
  static get defaultOptions() {
    return  mergeObject(super.defaultOptions, {
      id: "combat",
      template: "templates/sidebar/combat-tracker.html",
      title: "Global Combat Tracker"
    });
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

/*
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
  */

}//end class GlobalCombatTracker

class GlobalCombat extends Combat {



}//end class GlobalCombat


//Substitute the Global Combat Tracker for the default one
Hooks.on("init", () => {
  CONFIG.ui.combat = GlobalCombatTracker;
  CONFIG.Combat.entityClass = GlobalCombat;
});
Hooks.on('setup', GlobalCombatTracker.setup);



//Hooks.on('getSceneControlButtons', GlobalCombatTracker.getSceneControlButtons);

/*
function isCopy(td) {
  //Return true only if there is a true flag entry
//FIXME: If td is null, then also (for now) is a copy
  return !td || (td.flags && td.flags[MODULE_NAME] && td.flags[MODULE_NAME].isCopy);
}
*/

//When you create a new Combatant, regardless of scene, add the token to the GlobalCombat scene
//Probably we will want to create a pseudo-scene that holds all the combined tokens
//Or some scene-view that merges the relevant scenes
Hooks.on('preCreateCombatant', async (thisCombat, combatant, options, userId) => {
  //Get full token data so we can include that (because the other combats won't be able to look it up)
  const fullToken = canvas.tokens?.objects?.children?.find(t => (t.id === combatant.tokenId));

  //If the token is not already in the Global Combat Scene, then add it
  const combatScene = thisCombat.scene;
  const foundToken = combatScene?.data.tokens?.find(st => st._id === combatant.tokenId);
  if (!foundToken) {
    //FIXME: Try just adding the token to the scene token list
    //It will be the wrong position etc. 
    combatScene.data.tokens.push(fullToken?.data);
  }

  return true;
});//end hook
/*
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
