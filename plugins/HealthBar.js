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
        this.addWindow(this._myWindow);
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
    
    Window_Base.prototype.drawActorLevel = function(actor, x, y) {
        this.changeTextColor(this.systemColor());
        this.drawText(TextManager.levelA, x, y, 48);
        this.resetTextColor();
        this.drawText(actor.level, x + 20, y, 36, 'right');
    };

My_Window.prototype.refresh = function(){
    this.contents.clear();
    var actor = $gameParty.leader();
    var offset = 0;
    var width = this.textWidth(actor.name());
    this.drawActorName(actor, offset, 0, width);
    offset += width + 5;
    this.drawActorLevel(actor, offset, 0, 60);
    offset += 60;
    this.drawActorHp(actor, offset, 0, 155);
    offset += 160;
    this.drawActorMp(actor, offset, 0, 155);
    offset += 160;
    this.drawActorTp(actor, offset, 0, 155);
    offset += 160;
    this.drawActorIcons(actor, offset, 0, 300);
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