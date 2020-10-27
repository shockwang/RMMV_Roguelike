//=============================================================================
// main.js
//=============================================================================

PluginManager.setup($plugins);

window.onload = function() {
    SceneManager.run(Scene_Boot);
    var f = function() {
        if (SceneManager.isCurrentSceneStarted()) {
            // once initialized before every game
            MapUtils.initMsgWindow();
            return;
        }
        setTimeout(f, 50);
    }
    f();
};
