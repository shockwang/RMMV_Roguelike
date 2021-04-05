/*:
* @plugindesc HealthBar
* @author mrcopra, modified by shockwang
* 
* @help 
* 
*/
 (function() {
	 

//////////////////////////////////////////////////////////////////////////////////////

    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        this._myWindow = new My_Window(100,100);
        this.addWindow(this._myWindow);
    };
    
    // add for update player status after each step
    Scene_Map.prototype.setupStatus = function() {
        if (SceneManager.isCurrentSceneStarted()) {
            this.addWindow(this._myWindow);
        }
    }

    var _Scene_Map_update = Scene_Map.prototype.update;

    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this._myWindow.refresh();
    };

    function My_Window() {
        this.initialize.apply(this, arguments);
    }

    My_Window.prototype = Object.create(Window_Base.prototype);
    My_Window.prototype.constructor = My_Window;


    My_Window.prototype.initialize = function(x, y) {
        Window_Base.prototype.initialize.call(this, 0, 0, this.windowWidth(), this.windowHeight());
        this._value = -1;
        this.refresh();
    };
    
    My_Window.prototype.drawGameTime = function(x, y) {
        this.changeTextColor(this.systemColor());
        var length = this.textWidth("T:");
        this.drawText("T:", x, y, length);
        this.resetTextColor();
        var value = Math.round($gameVariables[0].gameTime / $gameVariables[0].gameTimeAmp);
        length = this.textWidth(value);
        this.drawText(value, x + 30, y, length, 'right');
    }

    My_Window.prototype.drawPlayerHp = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        let msg = 'HP:';
        let length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
        x += length;
        this.resetTextColor();
        let hpPercentage = actor.hp / actor.mhp;
        if (hpPercentage < 0.25) {
            this.changeTextColor('#FFFF00');
        }
        msg = '' + actor.hp;
        length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
    }

    My_Window.prototype.drawPlayerMp = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        let msg = 'MP:';
        let length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
        x += length;
        this.resetTextColor();
        let hpPercentage = actor.mp / actor.mmp;
        if (hpPercentage < 0.25) {
            this.changeTextColor('#FFFF00');
        }
        msg = '' + actor.mp;
        length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
    }

    My_Window.prototype.drawPlayerTp = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        let msg = 'EN:';
        let length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
        x += length;
        this.resetTextColor();
        let hpPercentage = actor.tp / 100;
        if (hpPercentage < 0.25) {
            this.changeTextColor('#FFFF00');
        }
        msg = '' + actor.tp;
        length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
    }

    My_Window.prototype.drawPlayerTp = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        let msg = 'EN:';
        let length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
        x += length;
        this.resetTextColor();
        let hpPercentage = actor.tp / 100;
        if (hpPercentage < 0.25) {
            this.changeTextColor('#FFFF00');
        }
        msg = '' + actor.tp;
        length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
    }

    My_Window.prototype.drawDungeonDepth = function(x, y) {
        this.changeTextColor(this.systemColor());
        let msg = 'Dlv:';
        let length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
        x += length;
        this.resetTextColor();
        msg = '' + ($gameMap.mapId() - 1);
        length = this.textWidth(msg);
        this.drawText(msg, x, y, length);
    }
    
    Window_Base.prototype.drawActorLevel = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        this.drawText(TextManager.levelA, x, y, 48);
        this.resetTextColor();
        this.drawText(actor.level, x + 20, y, 36, 'right');
    };
    
    // draw player status
    Window_Base.prototype.drawActorStatus = function(actor, x, y) {
        if (!$gameVariables[0]) {
            return;
        }
        var status = '';
        // deal with nutrition system
        if ($gameActors.actor(1).status.bellyStatus == 'FULL') {
            this.changeTextColor('#4169E1'); // royal blue
            status = '過飽 ';
        } else if ($gameActors.actor(1).status.bellyStatus == 'HUNGRY') {
            this.changeTextColor('#FFFF00'); // yellow
            status = '飢餓 ';
        } else if ($gameActors.actor(1).status.bellyStatus == 'WEAK') {
            this.changeTextColor('#FF8C00'); // dark orange
            status = '虛弱 ';
        } else if ($gameActors.actor(1).status.bellyStatus == 'FAINT') {
            this.changeTextColor('#FF0000'); // red
            status = '昏厥 ';
        }
        var width = this.textWidth(status);
        this.drawText(status, x, y, width);
        x += width;
        // draw buff/debuff
        let debuffColor = '#FF0000';
        let buffColor = '#00FF23';
        if ($gameActors.actor(1).status.blindCount > 0) {
            this.changeTextColor(debuffColor);
            status = '失明 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.paralyzeCount > 0) {
            this.changeTextColor(debuffColor);
            status = '麻痺 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.sleepCount > 0) {
            this.changeTextColor(debuffColor);
            status = '昏睡 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.poisonCount > 0) {
            this.changeTextColor(debuffColor);
            status = '中毒 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.speedUpCount > 0) {
            this.changeTextColor(buffColor);
            status = '加速 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.invisibleCount > 0) {
            this.changeTextColor(buffColor);
            status = '隱形 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        if ($gameActors.actor(1).status.seeInvisibleCount > 0) {
            this.changeTextColor(buffColor);
            status = '偵測隱形 ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
        for (let id in $gameActors.actor(1).status.skillEffect) {
            let skillEffect = $gameActors.actor(1).status.skillEffect[id];
            let color = (skillEffect.skill.isBuff) ? buffColor : debuffColor;
            this.changeTextColor(color);
            status = skillEffect.skill.name + ' ';
            width = this.textWidth(status);
            this.drawText(status, x, y, width);
            x += width;
        }
    }

    My_Window.prototype.refresh = function(){
        this.contents.clear();
        var actor = $gameParty.leader();
        var offset = 0;
        var width = this.textWidth(actor.name());
        this.drawActorName(actor, offset, 0, width);
        offset += width + 5;
        this.drawActorLevel(actor, offset, 0);
        offset += 60;
        // this.drawActorHp(actor, offset, 0, 155);
        // offset += 160;
        this.drawPlayerHp(actor, offset, 0);
        offset += 100;
        // this.drawActorMp(actor, offset, 0, 155);
        // offset += 160;
        this.drawPlayerMp(actor, offset, 0);
        offset += 100;
        // this.drawActorTp(actor, offset, 0, 155);
        // offset += 160;
        this.drawPlayerTp(actor, offset, 0);
        offset += 100;
        if ($gameVariables[0]) {
            var value = "T:" + Math.round($gameVariables[0].gameTime / $gameVariables[0].gameTimeAmp);
            width = this.textWidth(value);
            this.drawGameTime(offset, 0);
            offset += width + 20;
        }
        this.drawDungeonDepth(offset, 0);
        offset += 80;
        this.drawActorStatus(actor, offset, 0);
        offset += 200;
        //this.drawActorIcons(actor, offset, 0, 300);
    };

    My_Window.prototype.windowWidth = function(){
    	//return 580;
        return 1024;
    };
       My_Window.prototype.windowHeight = function(){
    	return 70;
    };
	
///////////////////////////////////////////////////////////////////////////////////////////////	 
 })();