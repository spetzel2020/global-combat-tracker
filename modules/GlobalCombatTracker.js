
/*Global Combat Tracker
21-Nov-2020   0.1.0 Created
22-Nov-2020   0.1.0b Switch to a push model rather than pull (because otherwise we get caught in a render loop)
23-Nov-2020   0.1.0d: Now we need to echo the CT actions like:
              - roll initiative (should just copy from source for now)
              - advance turn (should duplicate - probably using a render hook)
23-Nov-2020   0.2.0: Switch to a new approach, bascially substituting a "Global Combat Tracker" for the standard one
              Use the render hooks to substitute the subclass GCT      
25-Nov-2020   0.2.0d: Pan to Scene and Token by storing scene with token in GlobalCombat, and overriding _onCombatantMouseDown
              FIXME: Doubtful that much of this will work right now if you're not the GM
*/

const GCT_MODULE_NAME = "global-combat-tracker";
const GCT_MODULE_VERSION = "0.2.0";
const GCT_MIRROR_SCENE_NAME = "GCT Mirror Scene";

class GlobalCombatTracker extends CombatTracker {

  /** @override */
  static get defaultOptions() {
    return  mergeObject(super.defaultOptions, {
      id: "combat",
      template: "templates/sidebar/combat-tracker.html",
      title: "Global Combat Tracker"
    });
  }



  /** @override */
  initialize({combat=null, render=true}={}) {
    //override the core behavior of only looking for a combat from the current scene if combat===null

    if (combat === null) {
      const combats = game.combats.entities ?? [];
      combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;
    }
    super.initialize({combat, render});
  }

  /** override */
  //Unfortunately because the superclass version gets token from canvas.tokens, we have to replace the whole function
  _onCombatantMouseDown(event) {
    event.preventDefault();

    const li = event.currentTarget;
    //const token = canvas.tokens.get(li.dataset.tokenId);
    const tokenId = li.dataset.tokenId;

    //Get the mirror token
    const tokenData = this.combat?.getTokenData(tokenId);
    //FIXME: if ( !token?.owner ) return;   //Failing at this, suggesting owner needs to be set when we create the mirrorToken

    const now = Date.now();
    // Handle double-left click to open sheet
    const dt = now - this._clickTime;
    this._clickTime = now;
    if ( dt <= 250 ) {
      //FIXME: Would like to use Actor.fromToken() because of the synthetic vs. real Actor
      const actor = game.actors.get(tokenData.actorId);
      if ( actor ) actor.sheet.render(true);
    }

    // Control and pan on single-left
    else {
      //Change to the relevant scene (the one the token was added from)
      const tokenScene = game.scenes.get(tokenData?.sceneId);
      tokenScene?.view().then(() => {
        //We store the real (x,y) coords even though it's from the mirror scene
        return canvas.animatePan({x: tokenData.x, y: tokenData.y});
      });
    }
  }



  static init() {
      game.settings.register(GCT_MODULE_NAME, "GCTVersion", {
        name: "version",
        hint: "",
        scope: "world",
        config: false,
        default: GCT_MODULE_VERSION,
        type: String
      });
      game.settings.register(GCT_MODULE_NAME, "enableGCT", {
        name: "GCT.Setting.Enable.NAME",
        hint: "GCT.Setting.Enable.HINT",  //Synchronize Combat Trackers across scenes
        scope: "client",
        config: true,
        default: true,
        type: Boolean
      });

  }
}//end class GlobalCombatTracker

class GlobalCombat extends Combat {
  static async getGC() {
    //Modeled after TokenLayer.toggleCombat()
    //There should be a GlobalCombat and GCT created in the sidebar, but if there isn't then create one
    let globalCombat = ui.combat?.combat;
    if ( !globalCombat && game.user.isGM ) {
        globalCombat = await game.combats.object.create({scene: canvas.scene._id, active: true});
    }
    return globalCombat;
  }

  /** @override */
  delete() {
    //If this is the last combat, also delete the pseudo Scene created
    //FIXME
    const mirrorScene = game.scenes.get(this.data.scene);
    mirrorScene.delete();
    super.delete();
  }

  /** @override  */
  createEmbeddedEntity(embeddedName, createData) {
    //Create this token(s) in the mirror scene if it doesn't already exist
    //Do this before we call the createEmbeddedEntity super-class so that it exists for reference
    for (const cd of createData) {
      if (!this.getTokenData(cd.tokenId)) {
        const fullToken = canvas.tokens?.get(cd.tokenId);
        //FIXME: We're going to try not even resetting the position
        if (fullToken) {
          fullToken.data.hidden = true;
          fullToken.data.sceneId = canvas.scene._id;  
          this.scene?.data.tokens.push(fullToken?.data);
        }
      }
    }

    super.createEmbeddedEntity(embeddedName, createData);
  }



  getTokenData(tokenId) {
    const gctScene = this.scene;  //actually looks up the stored scene._id
    const foundTokenData = gctScene?.data.tokens?.find(st => st._id === tokenId);  
    return foundTokenData;
  }

  static async ready() {
     if (!game.user.isGM) {return;}

    let mirrorScene = game.scenes.find(s => s.name === GCT_MIRROR_SCENE_NAME);

    if (!mirrorScene) {
      //Either retrieve or create a Global Combat Scene for mirroring token positions
      //Modeled on SceneDirectory._onCreate()
      const createData  = {
        name: GCT_MIRROR_SCENE_NAME,
        active: false,
        navigation: false,
        visible: false,     //not sure what this does but worth a try
        folder: null
      }
      mirrorScene = await Scene.create(createData);
    }

    //And now replace this into the GlobalCombat that should have already been created on startup
    const gc = await GlobalCombat.getGC();
    if (gc) {
      gc.data.scene = mirrorScene._id;
    }

  }

}//end class GlobalCombat



//Substitute the Global Combat Tracker and the Global Combat class for the default one
//This includes creating a pseudo-Scene which saves mirror versions of combatant tokens so that they are matched
//by Combat.createEmbeddedEntity()
Hooks.on("init", () => {
  CONFIG.ui.combat = GlobalCombatTracker;
  CONFIG.Combat.entityClass = GlobalCombat;

  GlobalCombatTracker.init();   //create settings
});

Hooks.on('ready', GlobalCombat.ready);



//Hooks.on('getSceneControlButtons', GlobalCombatTracker.getSceneControlButtons);

/*
function isCopy(td) {
  //Return true only if there is a true flag entry
//FIXME: If td is null, then also (for now) is a copy
  return !td || (td.flags && td.flags[MODULE_NAME] && td.flags[MODULE_NAME].isCopy);
}
*/

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
