
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
26-Nov-2020   0.2.0e: Turn this off if Enable setting is unchecked      
              GlobalCombat.createTokenInMirrorScene(): ADDED - although shouldn't actually create a Token  
              Not used for now because it's creating another tokenId for the inserted token rather than re-using the existing one      
*/

const GCT = {
  MODULE_NAME : "global-combat-tracker",
  MODULE_VERSION : "0.2.1",
  MIRROR_SCENE_NAME : "GCT Mirror Scene",
  ENABLE_KEY : "enable",
  VERSION_KEY : "version"
}

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

    if (game.settings.get(GCT.MODULE_NAME, GCT.ENABLE_KEY) && (combat === null)) {
      const combats = game.combats.entities ?? [];
      combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;
    }
    super.initialize({combat, render});
  }

  /** @override */
  //Unfortunately I see now easy way of not just copying CombatTracker.getData
  async getData(options) {
      // Get the combat encounters possible for the viewed Scene
      const combat = this.combat;
      const hasCombat = combat !== null;
      const mirrorScene = await GlobalCombat.getMirrorScene() || null;
      //This is the key step where we substitute the Global Combats
      const combats = mirrorScene ? game.combats.entities.filter(c => c.data.scene === mirrorScene._id) : [];
      const currentIdx = combats.findIndex(c => c === this.combat);
      const previousId = currentIdx > 0 ? combats[currentIdx-1].id : null;
      const nextId = currentIdx < combats.length - 1 ? combats[currentIdx+1].id : null;
      const settings = game.settings.get("core", Combat.CONFIG_SETTING);

      // Prepare rendering data
      const data = {
        user: game.user,
        combats: combats,
        currentIndex: currentIdx + 1,
        combatCount: combats.length,
        hasCombat: hasCombat,
        combat,
        turns: [],
        previousId,
        nextId,
        started: this.started,
        control: false,
        settings
      };
      if ( !hasCombat ) return data;

      // Add active combat data
      const combatant = combat.combatant;
      const hasControl = combatant && combatant.players && combatant.players.includes(game.user);

      // Format transient information about the combatant
      let hasDecimals = false;
      const turns = [];
      for ( let [i, t] of combat.turns.entries() ) {
        if ( !t.visible ) continue;

        // Thumbnail image for video tokens
        if ( VideoHelper.hasVideoExtension(t.img) ) {
          if ( t.thumb ) t.img = t.thumb;
          else t.img = t.thumb = await game.video.createThumbnail(t.img, {width: 100, height: 100});
        }

        // Copy the turn data
        const c = duplicate(t);
        if ( !hasDecimals && !Number.isInteger(c.initiative) ) hasDecimals = true;

        // Token status effect icons
        c.effects = new Set(c.token?.effects || []);
        if ( c.token?.overlayEffect ) c.effects.add(c.token.overlayEffect);
        if ( t.actor ) t.actor.temporaryEffects.forEach(e => {
          if ( e.getFlag("core", "statusId") === CONFIG.Combat.defeatedStatusId ) c.defeated = true;
          else if ( e.data.icon ) c.effects.add(e.data.icon);
        });

        // Track resources
        if ( c.permission < ENTITY_PERMISSIONS.OBSERVER ) c.resource = null;

        // Rendering states
        c.active = i === combat.turn;
        c.css = [
          c.active ? "active" : "",
          c.hidden ? "hidden" : "",
          c.defeated ? "defeated" : ""
        ].join(" ").trim();
        c.hasRolled = c.initiative !== null;
        c.hasResource = c.resource !== null;
        turns.push(c);
      }

      // Format displayed decimal places in the tracker
      turns.forEach(c => {
        c.initiative = c.initiative ? c.initiative.toFixed(hasDecimals ? CONFIG.Combat.initiative.decimals : 0) : null;
      });

      // Merge update data for rendering
      return mergeObject(data, {
        round: combat.data.round,
        turn: combat.data.turn,
        turns: turns,
        control: hasControl
      });
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
      game.settings.register(GCT.MODULE_NAME, GCT.VERSION_KEY, {
        name: "version",
        hint: "",
        scope: "world",
        config: false,
        default: GCT.MODULE_VERSION,
        type: String
      });
      game.settings.register(GCT.MODULE_NAME, GCT.ENABLE_KEY, {
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
  /** @override */
  // Called by toggleCombat if it doesn't find an existing combat
  static async create(data, options={}) {
    //Intercept Combat.create() to substitute the Mirror Scene
    const mirrorScene = await GlobalCombat.getMirrorScene();
    mergeObject(data, {scene: mirrorScene._id, active: false});
    return super.create(data, options);
  }



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
  async delete() {
    //FIXME: If this is the last combat, also delete the pseudo Scene created (currently it's deleting it every time)
    const mirrorScene = await GlobalCombat.getMirrorScene();
    mirrorScene.delete();
    super.delete();
  }

  /** @override  */
  async createEmbeddedEntity(embeddedName, createData) {
    if (game.settings.get(GCT.MODULE_NAME, GCT.ENABLE_KEY)) {
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
    }
    super.createEmbeddedEntity(embeddedName, createData);
  }

  async createTokenInMirrorScene(tokenData, options={}) {
    //Duplicates Token.create() -> PlaceableObject.create, except for the mirror scene
    const created = await this.scene.createEmbeddedEntity("Token", tokenData, options);
    if (!created) {return;}

    //Not clear this is relevant - Scene._onCreateEmbeddedEntity should have not added to the layer because scene is not being viewed
    if ( created instanceof Array ) {
      return created.map(c => this.layer?.get(c._id));
    } else {
      return this.layer?.get(created._id);
    }
  }

  getTokenData(tokenId) {
    const gctScene = this.scene;  //actually looks up the stored scene._id
    const foundTokenData = gctScene?.data.tokens?.find(st => st._id === tokenId);  
    return foundTokenData;
  }

  static async getMirrorScene() {
    //Get or create mirror scene
    let mirrorScene = game.scenes.find(s => s.name === GCT.MIRROR_SCENE_NAME);

    if (!mirrorScene) {
      //Either retrieve or create a Global Combat Scene for mirroring token positions
      //Modeled on SceneDirectory._onCreate()
      const createData  = {
        name: GCT.MIRROR_SCENE_NAME,
        active: false,
        navigation: false,
        visible: false,     //not sure what this does but worth a try
        folder: null
      }
      mirrorScene = await Scene.create(createData);
    }
    return mirrorScene;
  }

  static async ready() {
    if (!game.user.isGM || !game.settings.get(GCT.MODULE_NAME, GCT.ENABLE_KEY)) {return;}
    GlobalCombat.getMirrorScene();
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

