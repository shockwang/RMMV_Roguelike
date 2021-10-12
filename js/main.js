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
            MapUtils.loadMob();
            // game system setup
            $dataSystem.terms.params.push("武器威力"); // this one should be param(10)
            return;
        }
        setTimeout(f, 1);
    }
    f();
};
