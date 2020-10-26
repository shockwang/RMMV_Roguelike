// my plugin

(function () {
  var MapData = function(floorId, original, x, y) {
    this.base = floorId;
    this.bush = 0;
    this.decorate1 = 0;
    this.decorate2 = 0;
    this.shadow = 0;
    this.region = 0;

    // data added for explored/visible
    this.isExplored = false;
    this.isVisible = false;

    // original tile
    this.originalTile = original;

    // add for path finding
    this.x = x;
    this.y = y;
  }

  // data type for stairs
  StairData = function () {
    // 0: stair up, 1: stair down
    this.type = 0;
    this.x = 0;
    this.y = 0;
    this.toMapId = -1;
    this.toX = -1;
    this.toY = -1;
  }

  // data type for item piles
  var ItemPile = function (x, y) {
    this.x = x;
    this.y = y;
    this.items = [];
    this.weapons = [];
    this.armors = [];
    this.objectStack = [];
    this.lastImage = {};
  }

  var MapVariable = function (mapData, rmDataMap) {
    this.mapData = mapData;
    this.rmDataMap = rmDataMap;

    // indicates map attributes
    this.generateRandom = false;
    this.stairDownNum = 1;
    this.stairList = [];
  }

  var Coordinate = function (x, y) {
    this.x = x;
    this.y = y;
  }

  // class defined for player transfer
  var TransferInfo = function (toMapId, x, y) {
    this.toMapId = toMapId;
    this.nowX = x;
    this.nowY = y;
  }

  var ImageData = function(image, imageIndex, pattern, direction, name) {
    this.image = image;
    this.imageIndex = imageIndex;
    this.pattern = pattern;
    this.direction = direction;
    this.name = name;
  }

  var FLOOR = '□';
  var WALL = '■';
  var DOOR = 'Ｄ';

  // ----------map constants----------
  var ceilingCenter = 6752;
  var floorCenter = 2816;
  var warFogCenter = 3536;
  var upStair = 19;
  var downStair = 27;

  // door figures
  var doorClosedIcon = 512;
  var doorOpenedIcon = 528;

  // view parameters
  var viewDistance = 8;

  // room parameters
  var roomNum = 3, minRoomSize = 4, maxRoomSize = 16;
  var roomPercentage = 0.6;

  // word attached
  var groundWord = '(地上)';

  // ----------end of map constants----------

  // ----------start of game characters attributes setup
  // mapping: atk, param(2) -> 力量
  //          def, param(3) -> 體格
  //          mat, param(4) -> 智力
  //          mdf, param(5) -> 睿智
  //          agi, param(6) -> 敏捷
  //          luk, param(7) -> 運氣
  //          hit, param(8) -> 護甲強度
  //          eva, param(9) -> 魔法抗性
  //          cri, param(10) -> 武器威力
  var attributeNum = 9;
  //-----------end of game character attributes setup

  // TP designed for energy, attack/martial skills will decrease it, and will
  // auto recover when not doing attack actions
  var playerAttacked = false;
  var playerMoved = false;
  var playerDashed = false;

  // add format function to String
  String.format = function() {
    var s = arguments[0];
    if (s == null) return "";
    for (var i = 0; i < arguments.length - 1; i++) {
      var reg = getStringFormatPlaceHolderRegEx(i);
      s = s.replace(reg, (arguments[i + 1] == null ? "" : arguments[i + 1]));
    }
    return cleanStringFormatResult(s);
  }

  function getStringFormatPlaceHolderRegEx(placeHolderIndex) {
    return new RegExp('({)?\\{' + placeHolderIndex + '\\}(?!})', 'gm')
  }

  function cleanStringFormatResult(txt) {
    if (txt == null) return "";
    return txt.replace(getStringFormatPlaceHolderRegEx("\\d+"), "");
  }

  // for array shuffle with ranges
  function shuffle(a, begin, end) {
    var j, x, i;
    for (i = end; i >= begin; i--) {
        j = Math.floor(Math.random() * (i - begin + 1)) + begin;
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
  }

  // generating scroll name
  function genScrollName() {
    var result = '';
    let vocabulary = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    let length = getRandomIntRange(5, 20);
    for (let i = 0; i < length; i++) {
      result += vocabulary[getRandomInt(vocabulary.length)];
    }
    return result;
  }

  // generate image data mapping at first time
  function generateImageData() {
    var result = {};
    result.items = [];
    // food
    result.items[11] = new ImageData('Meat', 0, 2, 2);
    // potion
    result.items[31] = new ImageData('Collections1', 0, 0, 6, '紅色燒瓶');
    result.items[32] = new ImageData('Collections1', 0, 1, 6, '橙色燒瓶');
    result.items[33] = new ImageData('Collections1', 0, 2, 6, '黃色燒瓶');
    result.items[34] = new ImageData('Collections1', 1, 0, 6, '藍色燒瓶');
    result.items[35] = new ImageData('Collections1', 1, 1, 6, '紫色燒瓶');
    result.items[36] = new ImageData('Collections1', 1, 2, 6, '綠色燒瓶');
    result.items[37] = new ImageData('Collections1', 2, 0, 6, '灰色燒瓶');
    result.items[38] = new ImageData('Collections1', 2, 1, 6, '紅色試管');
    result.items[39] = new ImageData('Collections1', 2, 2, 6, '澄色試管');
    result.items[40] = new ImageData('Collections1', 3, 0, 6, '黃色試管');
    result.items[41] = new ImageData('Collections1', 3, 1, 6, '藍色試管');
    result.items[42] = new ImageData('Collections1', 3, 2, 6, '紫色試管');
    shuffle(result.items, 31, 42);
    // scroll
    for (let i = 51; i <= 58; i++) {
      result.items[i] = new ImageData('Collections3', 3, 1, 4, '卷軸: ' + genScrollName());
    }
  
    result.weapons = [];
    // long sword
    result.weapons[1] = new ImageData('Collections1', 4, 0, 4, '木柄劍');
    result.weapons[2] = new ImageData('Collections1', 4, 1, 4, '木柄長劍');
    result.weapons[3] = new ImageData('Collections1', 4, 2, 4, '寬柄長劍');
    result.weapons[4] = new ImageData('Collections1', 5, 0, 4, '鋸齒長劍');
    result.weapons[5] = new ImageData('Collections1', 5, 1, 4, '鋸齒闊劍');
    result.weapons[6] = new ImageData('Collections1', 5, 2, 4, '木柄闊劍');
    result.weapons[7] = new ImageData('Collections1', 6, 0, 4, '鐵灰色闊劍');
    shuffle(result.weapons, 1, 7);

    result.armors = [];
    // shield
    result.armors[1] = new ImageData('Collections2', 4, 0, 2, '圓木盾');
    result.armors[2] = new ImageData('Collections2', 4, 1, 2, '鑲鐵圓木盾');
    result.armors[3] = new ImageData('Collections2', 4, 2, 2, '長木盾');
    result.armors[4] = new ImageData('Collections2', 5, 0, 2, '塔盾');
    result.armors[5] = new ImageData('Collections2', 5, 1, 2, '骷髏面盾');
    result.armors[6] = new ImageData('Collections2', 5, 2, 2, '骨盾');
    result.armors[7] = new ImageData('Collections2', 6, 0, 2, '鐵製刺盾');
    shuffle(result.armors, 1, 7);
    return result;
  }

  // Language related data
  var Message = {
    language: 'chinese',
    chinese: {
      meleeAttack: '{0}對{1}造成了{2}點傷害.',
      projectileAttack: '{0}的{1}對{2}造成了{3}點傷害.',
      targetKilled: '{0}被{1}殺死了!',
      openDoor: '你打開了一扇門.',
      closeDoor: '你關上了一扇門.',
      goUpstair: '你往上走了一層.',
      goDownstair: '你往下走了一層.',
      getItems: '你撿起了{0}.',
      dropItems: '你丟下了{0}.',
      unIdentified: '未鑑定的物品.',
      potionBase: '藥水',
      scrollBase: '卷軸',
      bookBase: '魔法書',
      weaponSwordBase: '長劍',
      shieldBase: '盾牌',
      quaffPotion: '你喝下了{0}',
      quaffPotionHeal: '{0}恢復了{1}點生命力!',
      quaffPotionMana: '{0}恢復了{1}點魔力!',
      readScroll: '你閱讀了{0}.',
      scrollIdentifyRead: '你將{0}鑑定為{1}.',
      scrollEnchantArmorRead: '你身上的{0}發出一陣銀光!',
      scrollEnchantArmorReadDanger: '你身上的{0}發出刺眼的紅光, 並且劇烈震動起來!',
      scrollEnchantArmorReadEvaporate: '你身上的{0}劇烈震動, 然後汽化了!',
      scrollEnchantWeaponRead: '你手中的{0}發出一陣銀光!',
      scrollEnchantWeaponReadDanger: '你手中的{0}發出刺眼的紅光, 並且劇烈震動起來!',
      scrollEnchantWeaponReadEvaporate: '你手中的{0}劇烈震動, 然後汽化了!',
      scrollRemoveCurseRead: '你裝備中的{0}發出了溫暖的白光...',
      scrollTeleportRead: '你被傳送到地圖的某處!',
      scrollDestroyArmorRead: '你裝備中的{0}化為飛灰, 隨風飄散了!',
      scrollCreateMonsterRead: '怪物突然出現在你面前!',
      scrollScareMonsterRead: '空中突然響起巨大的恐怖聲音!',
      scrollReadNoEffect: '什麼事都沒發生...',
      removeEquip: '你卸下了{0}.',
      wearEquip: '你裝備上了{0}.',
      changeEquipCursed: '你嘗試卸下{0}, 但是失敗了!',
      throwItem: '{0}丟出了{1}!',
      throwPotionHit: '{0}在{1}頭上碎裂開來!',
      throwPotionCrash: '{0}碎裂開來, 你聞到一股奇怪的味道...',
      monsterFlee: '{0}轉身逃跑!'
    },
    display: function(msgName) {
      switch (Message.language) {
        case 'chinese':
          return Message.chinese[msgName];
        default:
          console.log('ERROR: No such language!');
          break;
      }
    }
  }

  //-----------------------------------------------------------------------------------
  // SetUtils
  //
  // Functions for sets, because Set() can not be stringfy

  SetUtils = function () {
    throw new Error('This is a static class');
  };

  SetUtils.add = function(obj, list) {
    for (let id in list) {
      if (list[id] == obj) {
        return;
      }
    }
    list.push(obj);
  }

  SetUtils.has = function(obj, list) {
    for (let id in list) {
      if (list[id] == obj) {
        return true;
      }
    }
    return false;
  }

  //-----------------------------------------------------------------------------------
  // MapUtils
  //
  // All random map related algorithm/functions

  MapUtils = function () {
    throw new Error('This is a static class');
  };

  MapUtils.initialize = function () {
    // define map variables here
    for (var i = 0; i < 5; i++) {
      $gameVariables[i + 1] = new MapVariable(null, null);
    }
    for (var i = 1; i < 5; i++) {
      $gameVariables[i + 1].generateRandom = true;
    }
    $gameVariables[5].stairDownNum = 0;

    // game system setup
    $dataSystem.terms.params.push("武器威力"); // this one should be param(10)

    // initialize $gameVariables[0] for multiple usage
    $gameVariables[0] = {};
    $gameVariables[0].transferInfo = null;
    $gameVariables[0].directionalAction = null;
    $gameVariables[0].directionalFlag = false;
    $gameVariables[0].messageFlag = false;
    $gameVariables[0].projectileMoving = false;
    $gameVariables[0].logList = []; // only 18 lines can be displayed
    // define game time (counts * gameTimeAmp for possible future extends)
    $gameVariables[0].gameTime = 0;
    $gameVariables[0].gameTimeAmp = 10;
    // define player attributes
    $gameVariables[0].player = {};
    $gameVariables[0].player.skillExp = {};
    $gameVariables[0].player.nutrition = 900;
    // initialize template events
    $gameVariables[0].templateEvents = {
      monster: $dataMap.events[3],
      door: $dataMap.events[4],
      projectile: $dataMap.events[5],
      itemPile: $dataMap.events[6]
    }
    // define data images mapping
    $gameVariables[0].itemImageData = generateImageData();

    // define identified data pool
    $gameVariables[0].identifiedObjects = [];

    // temp data for projectile
    $gameVariables[0].fireProjectileInfo = {
      item: null
    }

    for (let i = 0; i < 10; i++) {
      $gameParty.gainItem(new Sword(), 1);
      $gameParty.gainItem(new Shield(), 1);
      $gameParty.gainItem(new Scroll_Identify(), 1);
      $gameParty.gainItem(new Scroll_EnchantArmor(), 1);
      $gameParty.gainItem(new Scroll_EnchantWeapon(), 1);
      $gameParty.gainItem(new Scroll_RemoveCurse(), 1);
      $gameParty.gainItem(new Scroll_Teleport(), 1);
      $gameParty.gainItem(new Scroll_DestroyArmor(), 1);
      $gameParty.gainItem(new Scroll_CreateMonster(), 1);
      $gameParty.gainItem(new Scroll_ScareMonster(), 1);
      $gameParty.gainItem(new Potion_Heal(), 1);
      $gameParty.gainItem(new Potion_Mana(), 1);
    }
  }

  // message window defined here, because it can't be assigned to $gameVariables, will cause save/load crash
  var messageWindow;
  var messageWindowNonBlocking;
  var logWindow;

  MapUtils.initMsgWindow = function() {
    var width = Graphics.boxWidth;
    var height = Graphics.boxHeight / 4;
    var y = Graphics.boxHeight - height;
    messageWindow = new Window_Base(0, y, width, height);
    messageWindowNonBlocking = new Window_Base(0, y, width, height);
    messageWindowNonBlocking.opacity = 0;
    logWindow = new Window_Base(0, 100, Graphics.boxWidth, Graphics.boxHeight - 100);
  }


  // log related
  var LogUtils = {
    lineLimit: 18,
    displayLogWindow: function() {
      $gameVariables[0].messageFlag = true;
      let result = '';
      for (var id in $gameVariables[0].logList) {
        result += $gameVariables[0].logList[id] + '\n';
      }
      logWindow.contents.clear();
      logWindow.drawTextEx(result, 0, 0);
      SceneManager._scene.addChild(logWindow);
    },
    addLog: function(msg) {
      $gameVariables[0].logList.push(msg);
      if ($gameVariables[0].logList.length > LogUtils.lineLimit) {
        $gameVariables[0].logList.splice(0, 1);
      }
    },
    getCharName: function(name) {
      if (name == $gameActors._data[1].name()) {
        return '你';
      } else {
        return name;
      }
    }
  };
  MapUtils.logUtils = LogUtils; // for browser debugging

  MapUtils.displayMessage = function (msg) {
    $gameVariables[0].messageFlag = true;
    messageWindow.contents.clear();
    messageWindow.drawTextEx(msg, 0, 0);
    SceneManager._scene.addChild(messageWindow);
  }

  MapUtils.displayMessageNonBlocking = function (msg) {
    messageWindowNonBlocking.contents.clear();
    messageWindowNonBlocking.drawTextEx(msg, 0, 0);
    SceneManager._scene.addChild(messageWindowNonBlocking);
  }

  // used when message console already exists on map
  MapUtils.updateMessage = function (msg) {
    messageWindow.contents.clear();
    messageWindow.drawTextEx(msg, 0, 0);
  }

  // used to judge visible/walkable tiles
  MapUtils.isTilePassable = function (tile) {
    if (tile == FLOOR || tile == DOOR) {
      return true;
    }
    return false;
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  };

  function getRandomIntRange(min, max) {
    if (min == max) {
      return min;
    }
    return Math.floor(Math.random() * Math.floor(max - min)) + min;
  }

  // this function should be called twice (src must be a Game_Event)
  function updateVisible(src, distance, x, y, mapData) {
    var visible = false;
    if (Math.abs(src._x - x) <= distance && Math.abs(src._y - y) <= distance) {
      // around player, check visibility
      visible = true;
      if (src._x != x) {
        var path = [];
        var m = (src._y - y) / (src._x - x);
        var startX, endX, lastY;
        if (src._x - x > 0) {
          startX = x;
          endX = src._x;
          lastY = y;
        } else {
          startX = src._x;
          endX = x;
          lastY = src._y;
        }

        // start to check if vision blocked
        for (var i = startX + 1; i <= endX; i++) {
          var estimatedY = Math.round(m * (i - src._x) + src._y);

          // fill y-axis coordinates
          if (Math.abs(lastY - estimatedY) > 1) {
            var startY = (lastY - estimatedY > 0) ? estimatedY : lastY;
            var endY = (lastY - estimatedY > 0) ? lastY : estimatedY;
            for (var j = startY + 1; j < endY; j++) {
              var estimatedX = Math.round((j - src._y) / m + src._x);
              path.push(new Coordinate(estimatedX, j));
            }
          }
          path.push(new Coordinate(i, estimatedY));
          lastY = estimatedY;
        }

        for (var i = 0; i < path.length; i++) {
          // does not count the (x, y) point
          if (!(path[i].x == x && path[i].y == y)) {
            if (!MapUtils.isTilePassable(mapData[path[i].x][path[i].y].originalTile)) {
              visible = false;
              break;
            } else {
              // check if there's closed door
              var events = $gameMap.eventsXy(path[i].x, path[i].y);
              for (var id in events) {
                if (events[id] instanceof Game_Door && events[id].status != 2) {
                  visible = false;
                  break;
                }
              }
            }
          }
        }
      } else {
        var start = (src._y - y > 0) ? y : src._y;
        var end = (src._y - y > 0) ? src._y : y;

        // start to check if vision blocked
        for (var i = start + 1; i < end; i++) {
          if (!MapUtils.isTilePassable(mapData[x][i].originalTile)) {
            visible = false;
            break;
          } else {
            // check if there's closed door
            var events = $gameMap.eventsXy(x, i);
            for (var id in events) {
              if (events[id] instanceof Game_Door && events[id].status != 2) {
                visible = false;
                break;
              }
            }
          }
        }
      }

      // other ceiling check
      if (!visible && mapData[x][y].originalTile == WALL) {
        var xVisible = false, yVisible = false;
        if ((x - 1 >= 0 && mapData[x - 1][y].isVisible) || (x + 1 < mapData.length && mapData[x + 1][y].isVisible)) {
          xVisible = true;
        }
        if ((y - 1 >= 0 && mapData[x][y - 1].isVisible) || (y + 1 < mapData[0].length && mapData[x][y + 1].isVisible)) {
          yVisible = true;
        }
        if (xVisible && yVisible) {
          // corner case
          visible = true;
        }
      }
    }

    mapData[x][y].isVisible = visible;
  }

  function refineMapTile(east, west, south, north, centerTile) {
    var result = centerTile;
    if (east) {
      if (west) {
        if (north) {
          if (south) {
            result += 46;
          } else {
            result += 42;
          }
        } else {
          if (south) {
            result += 44;
          } else {
            result += 32;
          }
        }
      } else {
        if (north) {
          if (south) {
            result += 45;
          } else {
            result += 36;
          }
        } else {
          if (south) {
            result += 38;
          } else {
            result += 24;
          }
        }
      }
    } else {
      if (west) {
        if (north) {
          if (south) {
            result += 43;
          } else {
            result += 34;
          }
        } else {
          if (south) {
            result += 40;
          } else {
            result += 16;
          }
        }
      } else {
        if (north) {
          if (south) {
            result += 33;
          } else {
            result += 20;
          }
        } else {
          if (south) {
            result += 28;
          } else {
            result += 0;
          }
        }
      }
    }
    return result;
  }

  var showObjsOnMap = function() {
    // check non-blocking message
    let event = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y);
    if (event) {
      MapUtils.displayMessageNonBlocking(ItemUtils.displayObjStack(event.itemPile.objectStack));
    }
  }

  MapUtils.translateMap = function (rawData) {
    var mapData = new Array(rawData.length);
    for (var i = 0; i < mapData.length; i++) {
      mapData[i] = new Array(rawData[0].length);
      for (var j = 0; j < rawData[0].length; j++) {
        mapData[i][j] = new MapData(floorCenter, rawData[i][j], i, j);
      }
    }

    // deal with tile IDs
    var north, south, east, west;
    for (var j = 0; j < rawData[0].length; j++) {
      for (var i = 0; i < rawData.length; i++) {
        if (rawData[i][j] == FLOOR) {
          // skip the floor tunning
          continue;
        } else if (rawData[i][j] == WALL) {
          // deal with ceiling
          north = false, south = false, east = false, west = false;
          // check east
          if (i + 1 < rawData.length && rawData[i + 1][j] != WALL) {
            east = true;
          }
          // check west
          if (i - 1 >= 0 && rawData[i - 1][j] != WALL) {
            west = true;
          }
          // check north
          if (j - 1 >= 0 && rawData[i][j - 1] != WALL) {
            north = true;
          }
          // check south
          if (j + 1 < rawData.length && rawData[i][j + 1] != WALL) {
            south = true;
          }

          // now decide tile type
          mapData[i][j].base = refineMapTile(east, west, south, north, ceilingCenter);
        } else if (rawData[i][j] == DOOR) {
          new Game_Door(i, j);
        }
      }
    }

    return mapData;
  };

  MapUtils.drawMap = function (mapData, mapArray) {
    var mapSize = mapData.length * mapData[0].length;
    // do not update item piles & doors
    for (var i = 0; i < mapSize * 2; i++) {
      mapArray[i] = 0;
    }
    for (var i = mapSize * 4; i < mapArray.length; i++) {
      mapArray[i] = 0;
    }

    // first time update visibility
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        updateVisible($gamePlayer, viewDistance, i, j, mapData);
      }
    }

    var index = 0;
    var shadowOffset = mapSize * 4;
    var warFogOffset = mapSize;
    var stairOffset = mapSize * 2;
    var itemOffset = mapSize * 3;
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        // second time update visibility
        updateVisible($gamePlayer, viewDistance, i, j, mapData);
        if (mapData[i][j].isVisible || mapData[i][j].isExplored) {
          mapArray[index] = mapData[i][j].base;
          mapData[i][j].isExplored = true;
          if (mapData[i][j].isVisible) {
            // update item piles
            mapArray[itemOffset + index] = 0;
          }
        }
        if (!mapData[i][j].isVisible && mapData[i][j].isExplored) {
          mapArray[warFogOffset + index] = warFogCenter;
        }
        index++;
      }
    }
    // draw stairs
    for (var i in $gameVariables[$gameMap.mapId()].stairList) {
      var stair = $gameVariables[$gameMap.mapId()].stairList[i];
      if (mapData[stair.x][stair.y].isExplored) {
        var index = stairOffset + stair.y * mapData.length + stair.x;
        mapArray[index] = mapData[stair.x][stair.y].decorate2;
      }
    }

    // draw doors
    for (var i in $gameMap.events()) {
      var event = $gameMap.events()[i];
      if (event instanceof Game_Door && mapData[event._x][event._y].isVisible) {
        var index = stairOffset + event._y * mapData.length + event._x;
        mapArray[index] = (event.status == 2) ? doorOpenedIcon : doorClosedIcon;
      }
    }
  }

  MapUtils.drawEvents = function (mapData) {
    for (var i = 0; i < $gameMap.events().length; i++) {
      var event = $gameMap.events()[i];
      if (event.type == 'ITEM_PILE') {
        ItemUtils.updateItemPile(event);
      } else if (event._x > 0 && event._y > 0 && mapData[event._x][event._y].isVisible) {
        event.setOpacity(255);
      } else {
        event.setOpacity(0);
      }
    }
  }

  MapUtils.findEmptyFromList = function (list) {
    for (var i = 1; i < list.length; i++) {
      if (!list[i]) {
        return i;
      }
    }
    // list is full, extend its length;
    list.length++;
    return list.length - 1;
  }

  MapUtils.transferCharacter = function (character) {
    // check if this stair already exists
    var stair = null;
    var mapVariable = $gameVariables[$gameMap.mapId()];
    for (var i = 0; i < mapVariable.stairList.length; i++) {
      var candidate = mapVariable.stairList[i];
      if (character._x == candidate.x && character._y == candidate.y) {
        stair = candidate;
        break;
      }
    }
    if (!stair) {
      console.log("MapUtils.transferCharacter ERROR: stair should be exist.");
      return;
    }

    stair.toMapId = (stair.type == 0) ? $gameMap.mapId() - 1 : $gameMap.mapId() + 1;
    if (character == $gamePlayer) {
      $gameVariables[0].transferInfo = new TransferInfo(stair.toMapId, character._x, character._y);
      $gameScreen.startFadeOut(1);
      // wait until map is fully loaded
      var checkMapReady = function () {
        if (SceneManager.isCurrentSceneStarted()) {
          // update mobs time at target layer
          // TODO: implement mobs recovery mechanism
          for (var id in $gameMap.events()) {
            var event = $gameMap.events()[id];
            if (event instanceof Game_Mob) {
              event.mob.lastTimeMoved = $gameVariables[0].gameTime;
            }
          }
          $gameScreen.startFadeIn(1);
          TimeUtils.afterPlayerMoved();
        } else {
          console.log("map not ready yet.");
          setTimeout(checkMapReady, 100);
        }
      }
      setTimeout(checkMapReady, 100);
      $gamePlayer.setPosition(-10, -10);
      if (stair.toX == -1) {
        // not assigned yet, go to default position
        $gamePlayer.reserveTransfer(stair.toMapId, 0, 0, 0, 2);
      } else {
        MapUtils.transferNearbyMobs($gameMap.mapId(), stair.toMapId, stair.x, stair.y, stair.toX, stair.toY);
        $gamePlayer.reserveTransfer(stair.toMapId, stair.toX, stair.toY, 0, 2);
      }
    }
  }

  MapUtils.findEventsXyFromDataMap = function (dataMap, x, y) {
    var events = [];
    for (var i in dataMap.events) {
      var event = dataMap.events[i];
      if (event && event.x == x && event.y == y) {
        events.push(event);
      }
    }
    return events;
  }

  MapUtils.isTileAvailableForMob = function (mapId, x, y) {
    var occupied = false;
    var exists = MapUtils.findEventsXyFromDataMap($gameVariables[mapId].rmDataMap, x, y);
    for (var i in exists) {
      if (exists[i].type == 'MOB' || (exists[i].type == 'DOOR' && exists[i].status != 2)) {
        occupied = true;
      }
    }
    // check if player occupied
    if (mapId == $gameMap.mapId() && $gamePlayer._x == x && $gamePlayer._y == y) {
      occupied = true;
    }
    var tileAvailable = false;
    if (MapUtils.isTilePassable($gameVariables[mapId].mapData[x][y].originalTile)) {
      tileAvailable = true;
    }
    return !occupied && tileAvailable;
  }

  // nowMapId & toMapId $dataMap should be ready before call this function
  MapUtils.transferNearbyMobs = function (nowMapId, toMapId, nowX, nowY, newX, newY) {
    if (!$gameVariables[nowMapId].generateRandom || !$gameVariables[toMapId].generateRandom) {
      // no need to update static map
      return;
    }
    for (var i = 0; i < 8; i++) {
      var coordinate = MapUtils.getNearbyCoordinate(nowX, nowY, i);
      var events = MapUtils.findEventsXyFromDataMap($gameVariables[nowMapId].rmDataMap, coordinate.x, coordinate.y);
      for (var id in events) {
        if (events[id].type == 'MOB') {
          var mobData = events[id];
          // check for empty space, attempt to stand on the same relative location as player
          var toCheck = MapUtils.getNearbyCoordinate(newX, newY, i);
          var placeFound = false;
          if (MapUtils.isTileAvailableForMob(toMapId, toCheck.x, toCheck.y)) {
            placeFound = true;
          }
          if (!placeFound) {
            for (var j = 0; j < 8; j++) {
              toCheck = MapUtils.getNearbyCoordinate(newX, newY, j);
              if (MapUtils.isTileAvailableForMob(toMapId, toCheck.x, toCheck.y)) {
                placeFound = true;
                break;
              }
            }
          }
          if (placeFound) {
            // remove it from current $dataMap
            $gameVariables[nowMapId].rmDataMap.events[mobData.id] = null;
            // add it to new $dataMap
            var eventId = MapUtils.findEmptyFromList($gameVariables[toMapId].rmDataMap.events);
            mobData.id = eventId;
            mobData.x = toCheck.x;
            mobData.y = toCheck.y;
            $gameVariables[toMapId].rmDataMap.events[eventId] = mobData;
          } else {
            console.log("no empty found, stay at same level.");
          }
        }
      }
    }
  }

  MapUtils.refreshMap = function () {
    if ($gameVariables[$gameMap.mapId()].generateRandom) {
      // only update maps in random layer
      MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
      MapUtils.drawEvents($gameVariables[$gameMap.mapId()].mapData);
      //setTimeout('SceneManager.goto(Scene_Map)', 250);
      // try to use the following code, which make screen update not lag so much
      var scene = SceneManager._scene;
      scene.removeChild(scene._fadeSprite);
      scene.removeChild(scene._mapNameWindow);
      scene.removeChild(scene._windowLayer);
      scene.removeChild(scene._spriteset);
      scene.createDisplayObjects();
      scene.setupStatus();
    }
  }

  MapUtils.findAdjacentBlocks = function(target) {
    var result = [];
    for (let i = target._x - 1; i <= target._x + 1; i++) {
      for (let j = target._y - 1; j <= target._y + 1; j++) {
        if (i != target._x || j != target._y) {
          result.push(new Coordinate(i, j));
        }
      }
    }
    return result;
  }

  var RNG = [
    [0, 1, 2, 3],
    [0, 1, 3, 2],
    [0, 2, 1, 3],
    [0, 2, 3, 1],
    [0, 3, 1, 2],
    [0, 3, 2, 1],
    [1, 0, 2, 3],
    [1, 0, 3, 2],
    [1, 2, 0, 3],
    [1, 2, 3, 0],
    [1, 3, 0, 2],
    [1, 3, 2, 0],
    [2, 0, 1, 3],
    [2, 0, 3, 1],
    [2, 1, 0, 3],
    [2, 1, 3, 0],
    [2, 3, 0, 1],
    [2, 3, 1, 0],
    [3, 0, 1, 2],
    [3, 0, 2, 1],
    [3, 1, 0, 2],
    [3, 1, 2, 0],
    [3, 2, 0, 1],
    [3, 2, 1, 0]
  ];

  function genMapToMap(genMap) {
    // initialize map
    var map = new Array(genMap.length * 2 + 1);
    for (var i = 0; i < genMap.length * 2 + 1; i++) {
      map[i] = new Array(genMap[0].length * 2 + 1);
    }

    // fill the map
    for (var i = 0; i < map.length; i++) {
      map[i][0] = WALL;
    }
    for (var j = 0; j < map[0].length; j++) {
      map[0][j] = WALL;
    }

    var index = 1;
    for (var i = 0; i < genMap.length; i++) {
      for (var j = 0; j < genMap[i].length; j++) {
        map[i * 2 + index][j * 2 + index] = FLOOR;
        map[i * 2 + 1 + index][j * 2 + 1 + index] = WALL;
        // check if inside of room
        if (genMap[i][j].isRoom && !genMap[i][j].northWall && !genMap[i][j].eastWall) {
          map[i * 2 + 1 + index][j * 2 + 1 + index] = FLOOR;
        }

        var north;
        if (genMap[i][j].northWall) {
          north = WALL;
        } else if (genMap[i][j].northDoor) {
          north = DOOR;
        } else {
          north = FLOOR;
        }
        map[i * 2 + index][j * 2 + 1 + index] = north;

        var east;
        if (genMap[i][j].eastWall) {
          east = WALL;
        } else if (genMap[i][j].eastDoor) {
          east = DOOR;
        } else {
          east = FLOOR;
        }
        map[i * 2 + 1 + index][j * 2 + index] = east;
      }
    }
    return map;
  }

  // map data structure definition
  function Cell(x, y) {
    this.x = x;
    this.y = y;
    this.northWall = true;
    this.eastWall = true;
    // indicate doors
    this.northDoor = false;
    this.eastDoor = false;
    // indicates if room setup is done
    this.done = false;
    // room indicator
    this.isRoom = false;
    // region indicator
    this.regionId = 0;
  }

  function BaseRoom(startX, startY, width, height) {
    this.start = new Coordinate(startX, startY);
    this.width = width;
    this.height = height;
    // center coordinate for distance calculation
    this.center = new Coordinate(Math.round((2 * startX + width) / 2), Math.round((2 * startY + height) / 2));
  }

  function ExitCandidate(cell, direction) {
    this.cell = cell;
    this.direction = direction;
  }

  function fillMaze(map, startX, startY, regionId) {
    // generate map
    var queue = [];
    var x = startX, y = startY;
    var xNext, yNext;
    queue.push(map[x][y]);
    while (queue.length > 0) {
      map[x][y].done = true;
      map[x][y].regionId = regionId;
      xNext = x, yNext = y;
      var direction = RNG[getRandomInt(24)];
      var moved = false;
      for (var i = 0; i < direction.length; i++) {
        switch (direction[i]) {
          case 0: // east
            if (x + 1 < map.length && !map[x + 1][y].done) {
              map[x][y].eastWall = false;
              xNext++;
            }
            break;
          case 1: // north
            if (y + 1 < map[0].length && !map[x][y + 1].done) {
              map[x][y].northWall = false;
              yNext++;
            }
            break;
          case 2: // west
            if (x - 1 >= 0 && !map[x - 1][y].done) {
              map[x - 1][y].eastWall = false;
              xNext--;
            }
            break;
          case 3: // south
            if (y - 1 >= 0 && !map[x][y - 1].done) {
              map[x][y - 1].northWall = false;
              yNext--;
            }
            break;
        }
        // if moved
        if (x != xNext || y != yNext) {
          x = xNext, y = yNext;
          queue.push(map[x][y]);
          moved = true;
          break;
        }
      }
      if (!moved) { // no way to go
        var nextCell = queue.shift();
        x = nextCell.x, y = nextCell.y;
      }
    }
  }

  function initMaze(width, height) {
    // initialize
    var map = new Array(width);
    for (var i = 0; i < width; i++) {
      map[i] = new Array(height);
      for (var j = 0; j < height; j++) {
        map[i][j] = new Cell(i, j);
      }
    }
    return map;
  }

  genMapFullMaze = function (width, height) {
    var map = initMaze(width, height);
    fillMaze(map, 0, 0, 0);
    return map;
  }

  function fillRoomSetup(map, newRoom) {
    for (var j = newRoom.start.y; j < newRoom.start.y + newRoom.height; j++) {
      for (var i = newRoom.start.x; i < newRoom.start.x + newRoom.width; i++) {
        if (j + 1 < newRoom.start.y + newRoom.height) {
          // not y-axis border
          map[i][j].northWall = false;
        }
        if (i + 1 < newRoom.start.x + newRoom.width) {
          // not x-axis border
          map[i][j].eastWall = false;
        }
        map[i][j].isRoom = true;
        map[i][j].done = true;
      }
    }
  }

  function genRoomFromEmptySpaces(map) {
    // find largest empty space
    var candidateArea = null;
    for (var j = 0; j < map[0].length; j++) {
      for (var i = 0; i < map.length; i++) {
        if (map[i][j].done) {
          continue;
        }
        var startX = i, startY = j;
        var toX = i, toY = j;
        // check x-axis available range
        for (var k = startX; k < map.length; k++) {
          if (map[k][startY].done) {
            break;
          }
          toX++;
        }
        // check y-axis available range
        toY = map[0].length;
        for (var l = startY; l < map[0].length; l++) {
          for (var k = startX; k < toX; k++) {
            if (map[k][l].done) {
              toY = (toY > l) ? l : toY;
              break;
            }
          }
        }
        // room edge length must > 1
        if (toX - startX > 1 && toY - startY > 1) {
          // check area size
          var size = (toX - startX) * (toY - startY);
          if (size >= minRoomSize) {
            if (!candidateArea || size > candidateArea.width * candidateArea.height) {
              candidateArea = new BaseRoom(startX, startY, toX - startX, toY - startY);
            }
          }
        }
      }
    }
    if (!candidateArea) {
      // unable to find more empty space meet the requirement
      return null;
    }

    // generate a suitable room from candidateArea
    var newRoom = null;
    while (!newRoom) {
      var roomWidth = getRandomIntRange(2, candidateArea.width);
      var roomHeight = getRandomIntRange(2, candidateArea.height);
      if (roomWidth * roomHeight >= minRoomSize && roomWidth * roomHeight <= maxRoomSize) {
        // randomize start position
        var xOffset = getRandomInt(candidateArea.width - roomWidth);
        var yOffset = getRandomInt(candidateArea.height - roomHeight);
        newRoom = new BaseRoom(candidateArea.start.x + xOffset, candidateArea.start.y + yOffset, roomWidth, roomHeight);
      }
    }
    fillRoomSetup(map, newRoom);
    return newRoom;
  }

  function createRoomsNum(map) {
    var rooms = [];
    while (rooms.length < roomNum) {
      var newRoom = genRoomFromEmptySpaces(map);
      if (newRoom) {
        rooms.push(newRoom);
      } else {
        break;
      }
    }
    return rooms;
  }

  function createRoomsPercentage(map) {
    var percentage = 0;
    var rooms = [];
    while (percentage < roomPercentage) {
      var newRoom = genRoomFromEmptySpaces(map);
      if (newRoom) {
        rooms.push(newRoom);
      } else {
        break;
      }

      // calculate room percentage
      var totalCell = map.length * map[0].length;
      var roomCell = 0;
      for (var id in rooms) {
        var room = rooms[id];
        roomCell += room.width * room.height;
      }
      percentage = roomCell / totalCell;
    }
    return rooms;
  }

  genMapRoomsFullMaze = function (width, height) {
    var map = initMaze(width, height);
    var rooms = createRoomsPercentage(map);

    // fill the rest with maze
    var regionId = 0;
    for (var j = 0; j < map[0].length; j++) {
      for (var i = 0; i < map.length; i++) {
        if (!map[i][j].done) {
          fillMaze(map, i, j, regionId);
          regionId++;
        }
      }
    }

    // add exists to each room, connect all isolated regions
    var maxRegions = 100;
    for (var i = 0; i < rooms.length; i++) {
      var regions = new Array(maxRegions);
      for (var j = 0; j < regions.length; j++) {
        regions[j] = [];
      }
      // search edge of the room, divided by regionId
      var room = rooms[i];
      // handle with x-axis direction
      for (var j = room.start.x; j < room.start.x + room.width; j++) {
        if (room.start.y - 1 >= 0 && !map[j][room.start.y - 1].isRoom) {
          regions[map[j][room.start.y - 1].regionId].push(new ExitCandidate(map[j][room.start.y], "SOUTH"));
        }
        if (room.start.y + room.height < map[0].length && !map[j][room.start.y + room.height].isRoom) {
          regions[map[j][room.start.y + room.height].regionId].push(new ExitCandidate(map[j][room.start.y + room.height - 1], "NORTH"));
        }
      }
      // handle with y-axis direction
      for (var j = room.start.y; j < room.start.y + room.height; j++) {
        if (room.start.x - 1 >= 0 && !map[room.start.x - 1][j].isRoom) {
          regions[map[room.start.x - 1][j].regionId].push(new ExitCandidate(map[room.start.x][j], "WEST"));
        }
        if (room.start.x + room.width < map.length && !map[room.start.x + room.width][j].isRoom) {
          regions[map[room.start.x + room.width][j].regionId].push(new ExitCandidate(map[room.start.x + room.width - 1][j], "EAST"));
        }
      }

      // now generate exits for each region
      var totalExits = 0;
      for (var j = 0; j < regions.length; j++) {
        if (regions[j].length == 0) {
          continue;
        }
        var thisRegion = regions[j];
        var exit = thisRegion[getRandomInt(thisRegion.length)];
        // create exit
        switch (exit.direction) {
          case "SOUTH":
            map[exit.cell.x][exit.cell.y - 1].northWall = false;
            map[exit.cell.x][exit.cell.y - 1].northDoor = true;
            break;
          case "NORTH":
            exit.cell.northWall = false;
            exit.cell.northDoor = true;
            exit.cell.isRoom = false;
            break;
          case "WEST":
            map[exit.cell.x - 1][exit.cell.y].eastWall = false;
            map[exit.cell.x - 1][exit.cell.y].eastDoor = true;
            break;
          case "EAST":
            exit.cell.eastWall = false;
            exit.cell.eastDoor = true;
            exit.cell.isRoom = false;
            break;
        }
        totalExits++;
      }
      if (totalExits == 0) {
        // surrounded by rooms, create 1 exit
        var done = false;
        while (!done) {
          switch (getRandomInt(4)) {
            case 0: // north
              if (room.start.y + room.height == map[0].length) {
                continue;
              }
              var x = getRandomIntRange(room.start.x, room.start.x + room.width);
              var y = room.start.y + room.height - 1;
              map[x][y].northWall = false;
              map[x][y].northDoor = true;
              map[x][y].isRoom = false;
              done = true;
              break;
            case 1: // south
              if (room.start.y == 0) {
                continue;
              }
              var x = getRandomIntRange(room.start.x, room.start.x + room.width);
              var y = room.start.y - 1;
              map[x][y].northWall = false;
              map[x][y].northDoor = true;
              map[x][y].isRoom = false;
              done = true;
              break;
            case 2: // east
              if (room.start.x + room.width == map.length) {
                continue;
              }
              var x = room.start.x + room.width - 1;
              var y = getRandomIntRange(room.start.y, room.start.y + room.height);
              map[x][y].eastWall = false;
              map[x][y].eastDoor = true;
              map[x][y].isRoom = false;
              done = true;
              break;
            case 3: // west
              if (room.start.x == 0) {
                continue;
              }
              var x = room.start.x - 1;
              var y = getRandomIntRange(room.start.y, room.start.y + room.height);
              map[x][y].eastWall = false;
              map[x][y].eastDoor = true;
              map[x][y].isRoom = false;
              done = true;
              break;
          }
        }
      }
    }
    return map;
  }

  function findShortestPossiblePath(map, path, targetRoom) {
    var found = false;
    var nowX = path[path.length - 1].x;
    var nowY = path[path.length - 1].y;
    while (!found) {

    }
    return found;
  }

  function findPathBetweenRooms(map, room1, room2) {
    var pathFound = false;
    var path = [];
    while (!pathFound) {
      var steps = RNG[getRandomInt(24)];
      for (var i = 0; i < steps.length; i++) {
        var x, y;
        switch (steps[i]) {
          case 0: // east
            x = room1.start.x + room1.width - 1;
            y = getRandomIntRange(room1.start.y, room1.start.y + room1.height);
            path.push(map[x][y]);
            path.push(map[x + 1][y]);
        }
      }
    }
  }

  MapUtils.getDistance = function (x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  genMapRoomsRoguelike = function (width, height) {
    var map = initMaze(width, height);
    var rooms = createRoomsPercentage(map);

    var connectedRooms = [];
    // start to connect all rooms
    while (rooms.length > 0) {
      var roomNow = rooms[getRandomInt(rooms.length)];
      var candidate = null;
      var shortest = 1000;
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i] == roomNow) {
          continue;
        }
        // calculate the distance between each rooms, choose the shortest one
        var distance = Math.sqrt(Math.pow(roomNow.center.x - rooms[i].center.x, 2) + Math.pow(roomNow.center.y - rooms[i].center.y, 2));
        if (distance < shortest) {
          distance = shortest;
          candidate = rooms[i];
        }
      }

    }
    return map;
  }

  MapUtils.generateMapData = function (genMapFunction, width, height) {
    var mapRaw = genMapFunction(width, height);
    var mapPixel = genMapToMap(mapRaw);
    return mapPixel;
  }

  MapUtils.getNearbyCoordinate = function (x, y, index) {
    var result = new Coordinate(x, y);
    switch (index) { // check path clock-wise
      case 0: // east
        result.x++;
        break;
      case 1: // east-south
        result.x++;
        result.y--;
        break;
      case 2: // south
        result.y--;
        break;
      case 3: // west-south
        result.x--;
        result.y--;
        break;
      case 4: // west
        result.x--;
        break;
      case 5: // west-north
        result.x--;
        result.y++;
        break;
      case 6: // north
        result.y++;
        break;
      case 7: // east-north
        result.x++;
        result.y++;
        break;
    }
    return result;
  }

  // find route between two events (not very useful...put away by now)
  MapUtils.findShortestRoute = function (x1, y1, x2, y2) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var path = [], explored = [];
    if (mapData[x1][y1].originalTile != FLOOR || mapData[x2][y2].originalTile != FLOOR) {
      console.log("MapUtils.findShortestRoute() error: point not on FLOOR.");
      return null;
    }
    var hasPath = true, dstReached = false;
    var curX = x1, curY = y1;
    var nextX, nextY;
    // first add src point being explored
    explored.push(mapData[x1][y1]);
    while (hasPath && !dstReached) {
      hasPath = false;
      for (var i = 0; i < 8; i++) {
        nextX = curX, nextY = curY;
        var nextCoordinate = getNearbyCoordinate(curX, curY, i);
        nextX = nextCoordinate.x;
        nextY = nextCoordinate.y;
        if (mapData[nextX][nextY].originalTile == FLOOR
          && !explored.includes(mapData[nextX][nextY])
          && !path.includes(mapData[nextX][nextY])) {
          hasPath = true;
          // check if destination reached
          if (nextX == x2 && nextY == y2) {
            dstReached = true;
          } else {
            //console.log("node pushed. x: %d, y: %d", nextX, nextY);
            path.push(mapData[nextX][nextY]);
            explored.push(mapData[nextX][nextY]);
            curX = nextX;
            curY = nextY;
          }
          break;
        }
      }
      if (!hasPath) {
        // dead end, try to go back and try another node from the current path
        path.pop();
        if (path.length > 0) {
          var lastNode = path[path.length - 1];
          curX = lastNode.x;
          curY = lastNode.y;
          hasPath = true;
        }
      }
    }
    console.log("original path length: %d", path.length);
    for (var i = 0; i < path.length; i++) {
      console.log("x: %d, y: %d", path[i].x, path[i].y);
    }
    // refine the path
    var index = 0;
    while (index < path.length) {
      for (var i = path.length - 1; i > index; i--) {
        if (MapUtils.isNearBy(path[index].x, path[index].y, path[i].x, path[i].y)
          && i - index > 1) {
          // redundant path between path[index] & path[i]
          path.splice(index + 1, i - index - 1);
          break;
        }
      }
      index++;
    }
    console.log("refined path length: %d", path.length);
    for (var i = 0; i < path.length; i++) {
      console.log("x: %d, y: %d", path[i].x, path[i].y);
    }
    return path;
  }

  MapUtils.isNearBy = function (x1, y1, x2, y2) {
    if (Math.abs(x1 - x2) < 2 && Math.abs(y1 - y2) < 2) {
      return true;
    }
    return false;
  }

  MapUtils.setupNewMap = function (mapId) {
    // first load map
    console.log("first load map: " + mapId);
    var rawMap = MapUtils.generateMapData(genMapRoomsFullMaze, 9, 9);
    var newMapData = MapUtils.translateMap(rawMap);
    $dataMap.width = rawMap.length;
    $dataMap.height = rawMap[0].length;
    $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
    $gameVariables[mapId].mapData = newMapData;
    $gameVariables[mapId].rmDataMap = $dataMap;
  }

  MapUtils.generateNewMapMobs = function (mapId) {
    var floors = MapUtils.findMapDataFloor($gameVariables[mapId].mapData);
    let mobCounts = Math.floor(floors.length * 0.02);
    for (let i = 0; i < mobCounts; i++) {
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob(mapId, floor.x, floor.y)) {
          // TODO: implement mob generating method
          new Bat(floor.x, floor.y);
          break;
        }
      }
    }
  }

  MapUtils.findMapDataFloor = function (mapData) {
    var floors = [];
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        if (mapData[i][j].originalTile == FLOOR) {
          floors.push(mapData[i][j]);
        }
      }
    }
    return floors;
  }

  //-----------------------------------------------------------------------------------
  // DataManager
  //
  // override map loading mechanism
  DataManager.onLoad = function (object) {
    var array;
    if (object === $dataMap) {
      if ($gameMap.mapId() > 0) {
        var targetMapId = ($gameVariables[0].transferInfo) ? $gameVariables[0].transferInfo.toMapId : $gameMap.mapId();
        if ($gameVariables[targetMapId].generateRandom) {
          if (!$gameVariables[targetMapId].mapData) {
            var nowMapId = $gameMap.mapId();
            // first time assign data
            MapUtils.setupNewMap(targetMapId);

            // collect all FLOOR tiles
            var mapVariable = $gameVariables[nowMapId];
            var targetMapData = $gameVariables[targetMapId].mapData;
            var floors = MapUtils.findMapDataFloor(targetMapData);
            // create down stairs
            var stairDownCreated = 0;
            while (stairDownCreated < $gameVariables[targetMapId].stairDownNum) {
              var candidate = floors[getRandomInt(floors.length)];
              var positionFound = true;
              for (var i in $gameVariables[targetMapId].stairList) {
                var toCheck = $gameVariables[targetMapId].stairList[i];
                if (candidate.x == toCheck.x && candidate.y == toCheck.y) {
                  positionFound = false;
                  break;
                }
              }
              if (positionFound) {
                var newStair = new StairData();
                newStair.type = 1;
                newStair.x = candidate.x;
                newStair.y = candidate.y;
                $gameVariables[targetMapId].stairList.push(newStair);
                $gameVariables[targetMapId].mapData[newStair.x][newStair.y].decorate2 = downStair;
                // no need to deal with connect information
                stairDownCreated++;
              }
            }

            // connect upper stairs
            for (var i = 0; i < mapVariable.stairList.length; i++) {
              var toConnect = mapVariable.stairList[i];
              if (toConnect.type != 1) {
                // only deal with stairs going down
                continue;
              }
              var positionFound = false;
              var toX, toY;
              while (!positionFound) {
                positionFound = true;
                var candidate = floors[getRandomInt(floors.length)];
                for (var j = 0; j < $gameVariables[targetMapId].stairList.length; j++) {
                  var toCheck = $gameVariables[targetMapId].stairList[j];
                  if (candidate.x == toCheck.x && candidate.y == toCheck.y) {
                    positionFound = false;
                    break;
                  }
                }
                if (positionFound) {
                  var newStair = new StairData();
                  newStair.type = 0;
                  newStair.x = candidate.x;
                  newStair.y = candidate.y;
                  newStair.toMapId = nowMapId;
                  newStair.toX = toConnect.x;
                  newStair.toY = toConnect.y;
                  $gameVariables[targetMapId].stairList.push(newStair);
                  targetMapData[newStair.x][newStair.y].decorate2 = upStair;

                  toConnect.toMapId = targetMapId;
                  toConnect.toX = newStair.x;
                  toConnect.toY = newStair.y;
                }
              }
            }
            var nowStair = null;
            for (var i = 0; i < $gameVariables[nowMapId].stairList.length; i++) {
              var candidate = $gameVariables[nowMapId].stairList[i];
              if (candidate.x == $gameVariables[0].transferInfo.nowX && candidate.y == $gameVariables[0].transferInfo.nowY) {
                nowStair = candidate;
                break;
              }
            }
            $gamePlayer.reserveTransfer(targetMapId, nowStair.toX, nowStair.toY, 0, 2);
            MapUtils.transferNearbyMobs(nowMapId, targetMapId, nowStair.x, nowStair.y, nowStair.toX, nowStair.toY);

            // new mobs in map
            var setupEvents = function (nowMapId, targetMapId, nowStair) {
              if (SceneManager.isCurrentSceneStarted()) {
                MapUtils.generateNewMapMobs(targetMapId);
                MapUtils.drawEvents($gameVariables[targetMapId].mapData);
                SceneManager.goto(Scene_Map);
              } else {
                setTimeout(setupEvents.bind(null, nowMapId, targetMapId, nowStair), 100);
              }
            }
            setTimeout(setupEvents.bind(null, nowMapId, targetMapId, nowStair), 100);
          } else {
            // assign map data here
            console.log("assign map data.");
            $dataMap = $gameVariables[targetMapId].rmDataMap;
          }
        }
      }
      this.extractMetadata(object);
      array = object.events;
    } else {
      array = object;
    }
    if (Array.isArray(array)) {
      for (var i = 0; i < array.length; i++) {
        var data = array[i];
        if (data && data.note !== undefined) {
          this.extractMetadata(data);
        }
      }
    }
    if (object === $dataSystem) {
      Decrypter.hasEncryptedImages = !!object.hasEncryptedImages;
      Decrypter.hasEncryptedAudio = !!object.hasEncryptedAudio;
      Scene_Boot.loadSystemImages();
    }
  };

  //-----------------------------------------------------------------------------------
  // Game_Player
  //
  // handle map change when player moved
  Game_Player.prototype.moveStraight = function (d) {
    var moved = false;
    var timeSpent = $gameVariables[0].gameTimeAmp;
    if (this.canPass(this.x, this.y, d)) {
      if (Input.isPressed('shift')) {
        if ($gameActors._data[1]._tp < 10) {
          MapUtils.displayMessage('你跑不動了...');
          return;
        } else {
          $gameActors._data[1].gainTp(-10);
          timeSpent /= 2;
          playerDashed = true;
        }
      }
      this._followers.updateMove();
      moved = true;
    }
    Game_Character.prototype.moveStraight.call(this, d);
    if (moved) {
      playerMoved = true;
      TimeUtils.afterPlayerMoved(timeSpent);
    }
  };

  Game_Player.prototype.moveDiagonally = function (horz, vert) {
    var moved = false;
    var timeSpent = $gameVariables[0].gameTimeAmp;
    if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
      if (Input.isPressed('shift')) {
        if ($gameActors._data[1]._tp < 10) {
          MapUtils.displayMessage('你跑不動了...');
          return;
        } else {
          $gameActors._data[1].gainTp(-10);
          timeSpent /= 2;
          playerDashed = true;
        }
      }
      this._followers.updateMove();
      moved = true;
    }
    Game_Character.prototype.moveDiagonally.call(this, horz, vert);
    if (moved) {
      playerMoved = true;
      TimeUtils.afterPlayerMoved(timeSpent);
    }
  };

  //-----------------------------------------------------------------------------------
  // Game_CharacterBase
  //
  // Modify moveDiagonally(), so it can trigger diagonal events
  Game_CharacterBase.prototype.moveDiagonally = function (horz, vert) {
    this.setMovementSuccess(this.canPassDiagonally(this._x, this._y, horz, vert));
    var moved = false;
    if (this.isMovementSucceeded()) {
      this._x = $gameMap.roundXWithDirection(this._x, horz);
      this._y = $gameMap.roundYWithDirection(this._y, vert);
      this._realX = $gameMap.xWithDirection(this._x, this.reverseDir(horz));
      this._realY = $gameMap.yWithDirection(this._y, this.reverseDir(vert));
      this.increaseSteps();
      moved = true;
    }
    if (this._direction === this.reverseDir(horz)) {
      this.setDirection(horz);
    }
    if (this._direction === this.reverseDir(vert)) {
      this.setDirection(vert);
    }
    // check diagonal event
    if (!moved) {
      this.checkEventTriggerTouchDiagonal(horz, vert);
    }
  };

  // add check function for diagonal events
  Game_CharacterBase.prototype.checkEventTriggerTouchDiagonal = function (horz, vert) {
    var x2 = $gameMap.roundXWithDirection(this._x, horz);
    var y2 = $gameMap.roundYWithDirection(this._y, vert);
    this.checkEventTriggerTouch(x2, y2);
  };

  // modify canPassDiagonally(), so character can move as long as target tile is empty
  Game_CharacterBase.prototype.canPassDiagonally = function (x, y, horz, vert) {
    if (this.isThrough() || this.isDebugThrough()) {
      return true;
    }
    var x2 = $gameMap.roundXWithDirection(x, horz);
    var y2 = $gameMap.roundYWithDirection(y, vert);
    if ($gameVariables[$gameMap.mapId()].mapData) { // map generated
      var mapData = $gameVariables[$gameMap.mapId()].mapData;
      if (MapUtils.isTilePassable(mapData[x2][y2].originalTile)) {
        // check if there's event on target tile which priority is as same as player
        var canPass = true;
        for (var i = 0; i < $gameMap.events().length; i++) {
          var toCheck = $gameMap.events()[i];
          if (!toCheck._erased && toCheck._x == x2 && toCheck._y == y2 && toCheck._priorityType == 1) {
            canPass = false;
            break;
          }
        }
        return canPass;
      }
    } else { // original logic
      if (this.canPass(x, y, vert) && this.canPass(x, y2, horz)) {
        return true;
      }
      if (this.canPass(x, y, horz) && this.canPass(x2, y, vert)) {
        return true;
      }
    }
    return false;
  };

  //-----------------------------------------------------------------------------------
  // Game_Map
  //
  // Modify isPassable() to fit map design
  Game_Map.prototype.isPassable = function (x, y, d) {
    // check if this map is generated
    if ($gameVariables[$gameMap.mapId()].generateRandom) {
      // check original map tile if can pass
      switch (d) {
        case 2: // down
          y++;
          break;
        case 4: // left
          x--;
          break;
        case 6: // right
          x++;
          break;
        case 8: // up
          y--;
          break;
      }
      if (MapUtils.isTilePassable($gameVariables[$gameMap.mapId()].mapData[x][y].originalTile)) {
        return true;
      }
      return false;
    } else {
      // use original logic
      return this.checkPassage(x, y, (1 << (d / 2 - 1)) & 0x0f);
    }
  }

  // try to modify setupEvents, so we can create different type events
  Game_Map.prototype.setupEvents = function () {
    this._events = [];
    for (var i = 0; i < $dataMap.events.length; i++) {
      if ($dataMap.events[i]) {
        if ($dataMap.events[i].type == 'MOB') {
          this._events[i] = new window[$dataMap.events[i].mob.mobClass]($dataMap.events[i].x
            , $dataMap.events[i].y, $dataMap.events[i]);
          if (!$gameVariables[this._mapId].mapData[this._events[i]._x][this._events[i]._y].isVisible){
            // player can't see
            this._events[i].setOpacity(0);
          }
        } else if ($dataMap.events[i].type == 'DOOR') {
          this._events[i] = new Game_Door($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
        } else if ($dataMap.events[i].type == 'ITEM_PILE') {
          this._events[i] = new Game_ItemPile($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
          ItemUtils.updateItemPile(this._events[i]);
        }
        else {
          this._events[i] = new Game_Event(this._mapId, i);
        }
      }
    }
    this._commonEvents = this.parallelCommonEvents().map(function (commonEvent) {
      return new Game_CommonEvent(commonEvent.id);
    });
    this.refreshTileEvents();
  };

  function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function newDataMapEvent(fromObj, id, x, y) {
    var newObj = cloneObject(fromObj);
    newObj.id = id;
    newObj.x = x;
    newObj.y = y;
    return newObj;
  }

  //-----------------------------------------------------------------------------------
  // Game_Mob
  //
  // The game object class for a mob (aggressive/passive), define mob status in
  // it. (HP/MP/attribute, etc)

  Game_Mob = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Mob.prototype = Object.create(Game_Event.prototype);
  Game_Mob.prototype.constructor = Game_Mob;

  Game_Mob.prototype.fromEvent = function (src, target) {
    target.mob = src.mob;
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
  }

  Game_Mob.prototype.initStatus = function (event) {
    // NOTE: attribute name must be the same as Game_Actor
    event.mob = this.mob;
    event.type = 'MOB';
  }

  Game_Mob.prototype.updateDataMap = function () {
    Game_Mob.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_Mob.prototype.initialize = function (x, y, mobId, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_Mob.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // new mob instance from mobId
      this.mob = new Game_Enemy(mobId, x, y);
      this.mob.awareDistance = 5;
      this.mob.afraidCount = 0;
      // find empty space for new event
      var eventId = MapUtils.findEmptyFromList($dataMap.events);
      $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.monster, eventId, x, y);
      this.initStatus($dataMap.events[eventId]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    $gameMap._events[eventId] = this;
  };

  Game_Mob.prototype.action = function () {
    // check if player is nearby
    let distance = MapUtils.getDistance(this._x, this._y, $gamePlayer._x, $gamePlayer._y);
    if (this.mob.afraidCount > 0) {
      this.moveAwayFromCharacter($gamePlayer);
      this.mob.afraidCount--;
    } else if (distance < 2) {
      this.turnTowardCharacter($gamePlayer);
      BattleUtils.meleeAttack(this, $gamePlayer);
    } else if (distance < this.mob.awareDistance) {
      this.moveTowardCharacter($gamePlayer);
    } else if (distance < 20) {
      this.moveRandom();
    } // otherwise don't do anything (for performance enhancement)

    // store data back to $dataMap
    if (distance < 20) {
      this.updateDataMap();
    }
  }

  // Override moveTowardCharacter() function so mobs can move diagonally
  Game_Mob.prototype.moveTowardCharacter = function (character) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var candidate = [], distanceRecord = [];
    var nowDistance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
    for (var i = 0; i < 8; i++) {
      var coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
      if (!MapUtils.isTilePassable(mapData[coordinate.x][coordinate.y].originalTile)) {
        continue;
      }
      var distance = MapUtils.getDistance(coordinate.x, coordinate.y, character._x, character._y);
      if (distance < nowDistance) {
        if (candidate.length == 0) {
          candidate.push(coordinate);
          distanceRecord.push(distance);
        } else {
          var added = false;
          for (var i = 0; i < candidate.length; i++) {
            if (distance < distanceRecord[i]) {
              candidate.splice(i, 0, coordinate);
              distanceRecord.splice(i, 0, distance);
              added = true;
              break;
            }
          }
          if (!added) {
            candidate.push(coordinate);
            distanceRecord.push(distance);
          }
        }
      }
    }
    for (var i = 0; i < candidate.length; i++) {
      var horz = 0, vert = 0;
      var sx = this.deltaXFrom(candidate[i].x);
      var sy = this.deltaYFrom(candidate[i].y);
      if (sx > 0) {
        horz = 4;
      } else if (sx < 0) {
        horz = 6;
      }
      if (sy > 0) {
        vert = 8;
      } else if (sy < 0) {
        vert = 2;
      }
      if (sx == 0 || sy == 0) {
        this.moveStraight((sx == 0) ? vert : horz);
      } else {
        this.moveDiagonally(horz, vert);
      }
      if (this.isMovementSucceeded()) {
        break;
      }
    }
    return this.isMovementSucceeded();
  }

  Game_Mob.prototype.moveAwayFromCharacter = function (character) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var candidate = [], distanceRecord = [];
    var nowDistance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
    for (var i = 0; i < 8; i++) {
      var coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
      if (!MapUtils.isTilePassable(mapData[coordinate.x][coordinate.y].originalTile)) {
        continue;
      }
      var distance = MapUtils.getDistance(coordinate.x, coordinate.y, character._x, character._y);
      if (distance > nowDistance) {
        if (candidate.length == 0) {
          candidate.push(coordinate);
          distanceRecord.push(distance);
        } else {
          var added = false;
          for (var i = 0; i < candidate.length; i++) {
            if (distance > distanceRecord[i]) {
              candidate.splice(i, 0, coordinate);
              distanceRecord.splice(i, 0, distance);
              added = true;
              break;
            }
          }
          if (!added) {
            candidate.push(coordinate);
            distanceRecord.push(distance);
          }
        }
      }
    }
    for (var i = 0; i < candidate.length; i++) {
      var horz = 0, vert = 0;
      var sx = this.deltaXFrom(candidate[i].x);
      var sy = this.deltaYFrom(candidate[i].y);
      if (sx > 0) {
        horz = 4;
      } else if (sx < 0) {
        horz = 6;
      }
      if (sy > 0) {
        vert = 8;
      } else if (sy < 0) {
        vert = 2;
      }
      if (sx == 0 || sy == 0) {
        this.moveStraight((sx == 0) ? vert : horz);
      } else {
        this.moveDiagonally(horz, vert);
      }
      if (this.isMovementSucceeded()) {
        break;
      }
    }
    return this.isMovementSucceeded();
  }

  // Override moveRandom() function so mobs can move diagonally
  Game_Mob.prototype.moveRandom = function () {
    var moveType = Math.randomInt(2);
    if (moveType == 0) { // straight
      Game_Event.prototype.moveRandom.call(this);
    } else { // diagonal
      var horz = 4 + Math.randomInt(2) * 2;
      var vert = 2 + Math.randomInt(2) * 6;
      if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
        this.moveDiagonally(horz, vert);
      }
    }
  }

  // override this function, so mobs can pass through door/itemPiles
  Game_Mob.prototype.isCollidedWithEvents = function (x, y) {
    return Game_CharacterBase.prototype.isCollidedWithEvents.call(this, x, y);
  };

  Game_Mob.prototype.looting = function () {
    // implement in mob instances
  }
  
  //-----------------------------------------------------------------------------------
  // Bat
  //
  // Game_Mob id 1

  Bat = function () {
    this.initialize.apply(this, arguments);
  }

  Bat.prototype = Object.create(Game_Mob.prototype);
  Bat.prototype.constructor = Bat;

  Bat.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, 1, fromData);
    this.setImage('Monster', 0);
    this.mob.awareDistance = 8;
    this.mob.mobClass = 'Bat';
  }

  Bat.prototype.looting = function () {
    var lootings = [];
    // corpse left
    var corpse = cloneObject($dataItems[11]);
    corpse.name = this.mob.name() + "的" + corpse.name;
    corpse.nutrition = 100;
    lootings.push(corpse);

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
  }

  //-----------------------------------------------------------------------------------
  // Game_Door
  //
  // The game object class for a door (opened/closed/locked), inherit from Game_Event
  Game_Door = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Door.prototype = Object.create(Game_Event.prototype);
  Game_Door.prototype.constructor = Game_Door;

  Game_Door.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.status = src.status;
  }

  Game_Door.prototype.initStatus = function (event) {
    event.type = 'DOOR';
    // 0: locked, 1: closed, 2: opened
    event.status = 1;
  }

  Game_Door.prototype.updateDataMap = function () {
    Game_Door.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_Door.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_Door.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // add new event at the bottom of list
      eventId = $dataMap.events.length;
      $dataMap.events.push(newDataMapEvent($gameVariables[0].templateEvents.door, eventId, x, y));
      Game_Door.prototype.initStatus($dataMap.events[$dataMap.events.length - 1]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameVariables[0].transferInfo.toMapId].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameVariables[0].transferInfo.toMapId, eventId);
    $gameMap._events[eventId] = this;
  };

  // try to open a door
  Game_Door.prototype.openDoor = function (character, x, y) {
    var events = $gameMap.eventsXy(x, y);
    var door = null;
    for (var i in events) {
      if (events[i] instanceof Game_Door) {
        door = events[i];
        break;
      }
    }
    if (!door) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage('這個方向沒有門哦.');
      }
      return false;
    }
    if (door.status == 2) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage("這扇門已經是打開的了.");
      }
      return false;
    } else if (door.status == 0) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage("這扇門是鎖著的.");
      }
      return false;
    }
    // open the door successfully
    door.status = 2;
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], true);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    LogUtils.addLog(Message.display('openDoor'));
    return true;
  }

  // try to close this door
  Game_Door.prototype.closeDoor = function (character, x, y) {
    var events = $gameMap.eventsXy(x, y);
    var door = null;
    for (var i in events) {
      if (events[i] instanceof Game_Door) {
        door = events[i];
        break;
      }
    }
    if (!door) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage("這個方向沒有門哦.");
      }
      return false;
    }
    if (door.status != 2) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage("這扇門已經是關上的了.");
      }
      return false;
    }
    // check if there's object blocked the doorway
    if (events.length > 1 || $gamePlayer.pos(x, y) || ItemUtils.findMapItemPileEvent(x, y)) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage("這扇門被什麼卡住了, 關不起來.");
      }
      return false;
    }
    // close the door successfully
    door.status = 1;
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], false);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    LogUtils.addLog(Message.display('closeDoor'));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Game_Projectile
  //
  // Prototype of projectiles, ammo, arrow, magic...etc
  // will not save to dataMap, therefore do not need 'fromData'

  Game_Projectile = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Projectile.prototype = Object.create(Game_Event.prototype);
  Game_Projectile.prototype.constructor = Game_Projectile;

  Game_Projectile.prototype.initStatus = function (event) {
    event.type = 'Projectile';
  }

  Game_Projectile.prototype.initialize = function (src, x, y) {
    var eventId = -1;
    // find empty space for new event
    var eventId = MapUtils.findEmptyFromList($dataMap.events);
    $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.projectile, eventId, src._x, src._y);
    this.initStatus($dataMap.events[eventId]);
    this.initStatus(this);
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    $gameMap._events[eventId] = this;

    // setup projectile movement
    this.src = src; // recognize for log purpose
    this.moveFunc = this.moveStraight;
    this.param1 = 6;
    if (src._x == x) {
      this.moveFunc = this.moveStraight;
      if (y - 1 == src._y) {
        this.param1 = 2;
      } else {
        this.param1 = 8;
      }
    } else if (src._y == y) {
      this.moveFunc = this.moveStraight;
      if (x - 1 == src._x) {
        this.param1 = 6;
      } else {
        this.param1 = 4;
      }
    } else {
      this.moveFunc = this.moveDiagonally;
      if (x - 1 == src._x) {
        if (y - 1 == src._y) {
          this.param1 = 6;
          this.param2 = 2;
        } else {
          this.param1 = 6;
          this.param2 = 8;
        }
      } else {
        if (y - 1 == src._y) {
          this.param1 = 4;
          this.param2 = 2;
        } else {
          this.param1 = 4;
          this.param2 = 8;
        }
      }
    }
    MapUtils.refreshMap();
    // show on map objs
    showObjsOnMap();
  };

  Game_Projectile.prototype.createProjectile = function(src, x, y) {
    let projectile = new Game_Projectile(src, x, y);
    projectile.action();
    $gameVariables[0].messageFlag = false;
    return true;
  }

  Game_Projectile.prototype.action = function () {
    this.distanceCount = 0;
    let originalX = this._x, originalY = this._y;
    let vanish = false;
    for (; this.distanceCount < this.distance; this.distanceCount++) {
      if (vanish) {
        break;
      }
      this.moveFunc(this.param1, this.param2);
      let events = $gameMap.eventsXy(this._x, this._y);
      for (let id in events) {
        let evt = events[id];
        if (evt.type == 'MOB' || evt == $gamePlayer) { // hit character
          vanish = this.hitCharacter(this, evt);
        } else if (evt.type == 'DOOR' && evt.status != 2) { // hit closed door
          vanish = this.hitDoor(this);
        }
      }
      // hit wall
      if ($gameVariables[$gameMap._mapId].mapData[this._x][this._y].originalTile == WALL) {
          vanish = this.hitWall(this);
      }
    }
    if (!vanish) {
      TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distance));
    }
    this.setPosition(originalX, originalY);
    return vanish;
  }

  Game_Projectile.prototype.hitCharacter = function(vm, evt) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    return true;
  }

  Game_Projectile.prototype.hitDoor = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    return true;
  }

  Game_Projectile.prototype.hitWall = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Projectile_Potion extends Game_Projectile
  Projectile_Potion = function () {
    this.initialize.apply(this, arguments);
  }

  Projectile_Potion.prototype = Object.create(Game_Projectile.prototype);
  Projectile_Potion.prototype.constructor = Projectile_Potion;

  Projectile_Potion.prototype.initialize = function (src, x, y) {
    Game_Projectile.prototype.initialize.call(this, src, x, y);
    // setup images
    let imageData = ItemUtils.getImageData($gameVariables[0].fireProjectileInfo.item);
    this._originalPattern = imageData.pattern;
    this.setPattern(imageData.pattern);
    this._direction = imageData.direction;
    this.setImage(imageData.image, imageData.imageIndex);
    this.distance = 5;
  };

  Projectile_Potion.prototype.createProjectile = function(src, x, y) {
    let projectile = new Projectile_Potion(src, x, y);
    if ($gameVariables[$gameMap._mapId].mapData[src._x][src._y].isVisible) {
      let realSrc = BattleUtils.getRealTarget(src);
      LogUtils.addLog(String.format(Message.display('throwItem'), LogUtils.getCharName(realSrc.name())
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
    projectile.action();
    // lose item
    if (src == $gamePlayer) {
      $gameParty.loseItem($gameVariables[0].fireProjectileInfo.item, 1);
    } else {
      // TODO: implement mob inventory
    }
    $gameVariables[0].messageFlag = false;
    return true;
  }

  Projectile_Potion.prototype.hitCharacter = function(vm, evt) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Crash"));
    if ($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y].isVisible) {
      let realTarget = BattleUtils.getRealTarget(evt);
      LogUtils.addLog(String.format(Message.display('throwPotionHit')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)
        , LogUtils.getCharName(realTarget.name())));
    }
    $gameVariables[0].fireProjectileInfo.item.onQuaff(evt);
    return true;
  }

  Projectile_Potion.prototype.hitDoor = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Crash"));
    if ($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y].isVisible) {
      LogUtils.addLog(String.format(Message.display('throwPotionCrash')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
    return true;
  }

  Projectile_Potion.prototype.hitWall = function(vm) {
    return this.hitDoor(vm);
  }

  Projectile_Potion.prototype.action = function () {
    let vanish = Game_Projectile.prototype.action.call(this);
    if (!vanish) {
      this.hitDoor(this);
    }
  }

  //-----------------------------------------------------------------------------------
  // FireBall extends Game_Projectile
  FireBall = function () {
    this.initialize.apply(this, arguments);
  }

  FireBall.prototype = Object.create(Game_Projectile.prototype);
  FireBall.prototype.constructor = FireBall;

  FireBall.prototype.initialize = function (src, x, y) {
    Game_Projectile.prototype.initialize.call(this, src, x, y);
    // setup images
    this.setImage('!Flame', 4);
    this.skillName = '火球術';
    this.distance = 5;
  };

  FireBall.prototype.createProjectile = function(src, x, y) {
    let projectile = new FireBall(src, x, y);
    projectile.action();
    $gameVariables[0].messageFlag = false;
    return true;
  }

  FireBall.prototype.hitCharacter = function(vm, evt) {
    let realSrc = BattleUtils.getRealTarget(vm.src);
    let realTarget = BattleUtils.getRealTarget(evt);
    let value = 30;
    realTarget._hp -= value;
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    TimeUtils.animeQueue.push(new AnimeObject(evt, 'ANIME', 67));
    TimeUtils.animeQueue.push(new AnimeObject(evt, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc.name())
      ,vm.skillName, LogUtils.getCharName(realTarget.name()), value));
    BattleUtils.checkTargetAlive(realSrc, realTarget, evt);
    vm.distanceCount = 99;
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Game_ItemPile
  //
  // The game object class for a itemPile on map, inherit from Game_Event
  Game_ItemPile = function () {
    this.initialize.apply(this, arguments);
  }

  Game_ItemPile.prototype = Object.create(Game_Event.prototype);
  Game_ItemPile.prototype.constructor = Game_ItemPile;

  Game_ItemPile.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.itemPile = src.itemPile;
  }

  Game_ItemPile.prototype.initStatus = function (event) {
    event.type = 'ITEM_PILE';
  }

  Game_ItemPile.prototype.updateDataMap = function () {
    Game_ItemPile.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_ItemPile.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_ItemPile.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // add new event at the bottom of list
      eventId = $dataMap.events.length;
      $dataMap.events.push(newDataMapEvent($gameVariables[0].templateEvents.itemPile, eventId, x, y));
      Game_ItemPile.prototype.initStatus($dataMap.events[$dataMap.events.length - 1]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameVariables[0].transferInfo.toMapId].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameVariables[0].transferInfo.toMapId, eventId);
    $gameMap._events[eventId] = this;
  };

  //-----------------------------------------------------------------------------------
  // Input
  //
  // try to add key defined by Input class
  // NOTE: find keyCode using Input._onKeyDown() in rpg_core.js
  Input.keyMapper[190] = '.'; // keyCode for '.'
  Input.keyMapper[101] = 'Numpad5'; // same function as '.'
  Input.keyMapper[53] = 'Numpad5';
  Input.keyMapper[12] = 'Numpad5';
  Input.keyMapper[103] = 'Numpad7'; // player move left-up (pc keyboard)
  Input.keyMapper[55] = 'Numpad7'; // (num key below f1~f12)
  Input.keyMapper[36] = 'Numpad7';
  Input.keyMapper[105] = 'Numpad9'; // player move right-up
  Input.keyMapper[57] = 'Numpad9';
  Input.keyMapper[33] = 'Numpad9';
  Input.keyMapper[97] = 'Numpad1'; // player move left-down
  Input.keyMapper[49] = 'Numpad1';
  Input.keyMapper[35] = 'Numpad1';
  Input.keyMapper[99] = 'Numpad3'; // player move right-down
  Input.keyMapper[51] = 'Numpad3';
  Input.keyMapper[34] = 'Numpad3';

  // modify _signX & signY, so arrow key triggered only once when pressed.
  Input._signX = function () {
    // do nothing
  };

  Input._signY = function () {
    // do nothing
  };

  // override this function for user-defined key detected (only on Scene_Map)
  Input._onKeyDown = function (event) {
    if (SceneManager._scene instanceof Scene_Map && !$gameMessage.isBusy() && $gamePlayer.canMove()
      && SceneManager.isCurrentSceneStarted()) {
      if ($gameVariables[0].directionalFlag) {
        // choose direction mode
        var x = $gamePlayer._x, y = $gamePlayer._y;
        switch (event.key) {
          case 'ArrowUp': case '8':
            y--;
            break;
          case 'ArrowDown': case '2':
            y++;
            break;
          case 'ArrowLeft': case '4':
            x--;
            break;
          case 'ArrowRight': case '6':
            x++;
            break;
          case '1': case 'End':
            x--;
            y++;
            break;
          case '3': case 'PageDown':
            x++;
            y++;
            break;
          case '7': case 'Home':
            x--;
            y--;
            break;
          case '9': case 'PageUp':
            x++;
            y--;
            break;
          default:
            MapUtils.updateMessage('這不是一個方向.');
            break;
        }
        if (!(x == $gamePlayer._x && y == $gamePlayer._y)) {
          playerMoved = $gameVariables[0].directionalAction($gamePlayer, x, y);
        }
        // check if player moved
        if (playerMoved) {
          // use async strategy, because $gameSelfSwitches needs time to update to event
          setTimeout('TimeUtils.afterPlayerMoved();', 100);
        }
        $gameVariables[0].directionalFlag = false;
        return;
      } else if ($gameVariables[0].messageFlag) {
        // just wait for next input to make the window disappear
        $gameVariables[0].messageFlag = false;
        SceneManager._scene.removeChild(messageWindow);
        SceneManager._scene.removeChild(logWindow);
        return;
      }
      switch (event.key) {
        case 'ArrowUp': case '8':
          $gamePlayer.moveStraight(8);
          break;
        case 'ArrowDown': case '2':
          $gamePlayer.moveStraight(2);
          break;
        case 'ArrowLeft': case '4':
          $gamePlayer.moveStraight(4);
          break;
        case 'ArrowRight': case '6':
          $gamePlayer.moveStraight(6);
          break;
        case '7': case 'Home':
          $gamePlayer.moveDiagonally(4, 8);
          break;
        case '9': case 'PageUp':
          $gamePlayer.moveDiagonally(6, 8);
          break;
        case '1': case 'End':
          $gamePlayer.moveDiagonally(4, 2);
          break;
        case '3': case 'PageDown':
          $gamePlayer.moveDiagonally(6, 2);
          break;
        case 'Enter': // quick action
          // check stairs
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y) {
              stair = candidate;
              break;
            }
          }
          if (stair) {
            MapUtils.transferCharacter($gamePlayer);
            if (1 == stair.type) {
              LogUtils.addLog(Message.display('goDownstair'));
            } else {
              LogUtils.addLog(Message.display('goUpstair'));
            }
            playerMoved = true;
          }
          break;
        case '.': case '5': case 'Clear': // wait action
          TimeUtils.afterPlayerMoved();
          break;
        case '>': // go down
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y && candidate.type == 1) {
              stair = candidate;
              break;
            }
          }
          if (stair) {
            MapUtils.transferCharacter($gamePlayer);
            LogUtils.addLog(Message.display('goDownstair'));
            playerMoved = true;
          } else {
            MapUtils.displayMessage("這裡沒有往下的樓梯.");
          }
          break;
        case '<': // go up
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y && candidate.type == 0) {
              stair = candidate;
              break;
            }
          }
          if (stair) {
            MapUtils.transferCharacter($gamePlayer);
            LogUtils.addLog(Message.display('goUpstair'));
            playerMoved = true;
          } else {
            MapUtils.displayMessage("這裡沒有往上的樓梯.");
          }
          break;
        case 'g': // pick things up from the ground
          if (ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y)) {
            SceneManager.push(Scene_OnMapItem);
          } else {
            MapUtils.displayMessage("這裡沒有東西可以撿.");
          }
          break;
        case 'd': // drop things from player inventory
          if (Object.keys($gameParty._items).length == 0 && Object.keys($gameParty._weapons).length == 0
            && Object.keys($gameParty._armors).length == 0) {
            MapUtils.displayMessage("你的身上沒有任何物品.");
          } else {
            SceneManager.push(Scene_DropItem);
          }
          break;
        case 'o': // open a door
          $gameVariables[0].directionalAction = Game_Door.prototype.openDoor;
          $gameVariables[0].directionalFlag = true;
          MapUtils.displayMessage('開哪個方向的門?');
          break;
        case 'c': // close a door
          $gameVariables[0].directionalAction = Game_Door.prototype.closeDoor;
          $gameVariables[0].directionalFlag = true;
          MapUtils.displayMessage('關哪個方向的門?');
          break;
        case 'i': // open inventory
          if (Object.keys($gameParty._items).length == 0 && Object.keys($gameParty._weapons).length == 0
            && Object.keys($gameParty._armors).length == 0) {
            MapUtils.displayMessage("你的身上沒有任何物品.");
          } else {
            SceneManager.push(Scene_Item);
          }
          break;
        case 'W': case 'w': // open equipment window
          SceneManager.push(Scene_Equip);
          break;
        case 'e': // eat food
          SceneManager.push(Scene_EatFood);
          break;
        case '/': // display log
          LogUtils.displayLogWindow();
          break;
        case 'f': // fire projectile
          // TODO: move fireball to cast functionality
          // $gameVariables[0].directionalAction = FireBall.prototype.createProjectile;
          // $gameVariables[0].directionalFlag = true;
          // MapUtils.displayMessage('往哪個方向發射?');
          SceneManager.push(Scene_FireProjectile);
          break;
        case 'q': // quaff potion
          SceneManager.push(Scene_QuaffPotion);
          break;
        case 'r': // read scroll
          SceneManager.push(Scene_ReadScroll);
          break;
      }
    }
    if (this._shouldPreventDefault(event.keyCode)) {
      event.preventDefault();
    }
    if (event.keyCode === 144) {    // Numlock
      this.clear();
    }
    var buttonName = this.keyMapper[event.keyCode];
    if (ResourceHandler.exists() && buttonName === 'ok') {
      ResourceHandler.retry();
    } else if (buttonName) {
      this._currentState[buttonName] = true;
    }
  };

  //-----------------------------------------------------------------------------------
  // TimeUtils
  //
  // time system to update the whole world
  TimeUtils = function () {
    throw new Error('This is a static class');
  }

  function AnimeObject(target, type, value) {
    this.target = target;
    this.type = type; // ANIME, POP_UP, PROJECTILE, SE
    this.value = value;
  }

  TimeUtils.animeIndicator = 0;
  TimeUtils.animeQueue = [];

  TimeUtils.playAnime = function() {
    let func = TimeUtils.playAnime, waiting = 0;
    if (!$gameVariables[0].projectileMoving) {
      if (TimeUtils.animeIndicator < TimeUtils.animeQueue.length) {
        let anime = TimeUtils.animeQueue[TimeUtils.animeIndicator];
        switch (anime.type) {
          case 'ANIME':
            anime.target.requestAnimation(anime.value);
            break;
          case 'POP_UP':
            let str;
            if (anime.value > 0) {
              str = "\\c[24]  +";
            } else {
              str = "\\c[18]  ";
            }
            $gameSystem.createPopup(0, "", str + anime.value, anime.target);
            break;
          case 'PROJECTILE':
            $gameVariables[0].projectileMoving = true;
            anime.target.distance = anime.value;
            anime.target.distanceCount = 0;
            let f = function(target) {
              target.moveFunc(target.param1, target.param2);
              target.distanceCount++;
              if (target.distanceCount > target.distance) {
                $gameVariables[0].projectileMoving = false;
                target.setPosition(-10, -10);
                $gameMap._events[target._eventId] = null;
                $dataMap.events[target._eventId] = null;
                return;
              }
              setTimeout(f, 50, target);
            }
            f(anime.target);
            break;
          case 'SE':
            AudioManager.playSe({name: anime.value, pan: 0, pitch: 100, volume: 100});
            break;
          default:
            console.log('ERROR: no such type: ' + anime.type);
            break;
        }
        TimeUtils.animeIndicator++;
      } else {
        TimeUtils.animeIndicator = 0;
        TimeUtils.animeQueue.length = 0;
        return;
      }
    }
    setTimeout(func, waiting);
  }

  TimeUtils.afterPlayerMoved = function (timeSpent) {
    // block player from moving
    $gamePlayer._vehicleGettingOn = true;
    var player = $gameActors._data[1];
    if (!timeSpent) {
      timeSpent = $gameVariables[0].gameTimeAmp;
    }
    player.lastTimeMoved += timeSpent;
    while (timeSpent > 0) {
      var updateTime = (timeSpent - $gameVariables[0].gameTimeAmp >= 0) ? $gameVariables[0].gameTimeAmp : timeSpent;
      timeSpent -= updateTime;
      $gameVariables[0].gameTime += updateTime;
      var gameTurn = Math.floor($gameVariables[0].gameTime / $gameVariables[0].gameTimeAmp);
      if (gameTurn % 20 == 0) {
        // regenerate HP
        var regenValue = Math.round(1 + player.param(3) / 3);
        regenValue = getRandomIntRange(1, regenValue);
        player.gainHp(regenValue);

        // regenerate MP
        regenValue = Math.round(1 + player.param(5) / 3);
        regenValue = getRandomIntRange(1, regenValue);
        player.gainMp(regenValue);
      }
      // update all mobs & items
      for (var i = 0; i < $gameMap._events.length; i++) {
        if (player._hp <= 0) {
          // player died, stop mob action
          break;
        }
        var event = $gameMap._events[i];
        if (!event || event._erased) {
          continue;
        }
        if (event.type == 'MOB' && $gameVariables[0].gameTime - event.mob.lastTimeMoved >= $gameVariables[0].gameTimeAmp) {
          // TODO: implement mob action speed
          event.mob.lastTimeMoved += $gameVariables[0].gameTimeAmp;
          event.action();
        }
      }
      // play queued anime
      TimeUtils.playAnime();
      // deal with energy calculation
      if (playerDashed || playerAttacked) {
        // huge movement, do nothing
      } else if (playerMoved) {
        player.gainTp(3);
      } else {
        // player rest
        player.gainTp(6);
      }
      MapUtils.refreshMap();
      // show on map objs
      showObjsOnMap();

      playerAttacked = false;
      playerMoved = false;
      playerDashed = false;
    }
    // player moveable again
    $gamePlayer._vehicleGettingOn = false;
  }

  //-----------------------------------------------------------------------------------
  // BattleUtils
  //
  // handles battle on map
  BattleUtils = function () {
    throw new Error('This is a static class');
  }

  BattleUtils.getRealTarget = function(src) {
    return (src == $gamePlayer) ? $gameActors._data[1] : src.mob;
  }

  BattleUtils.checkTargetAlive = function(realSrc, realTarget, target) {
    if (realTarget._hp <= 0) {
      LogUtils.addLog(String.format(Message.display('targetKilled'), LogUtils.getCharName(realTarget.name())
        , LogUtils.getCharName(realSrc.name())));
      if (target == $gamePlayer) {
        BattleUtils.playerDied('你被' + realSrc.name() + '殺死了...');
      } else {
        target.looting();
        realSrc.gainExp(realTarget.exp());
        // remove target event from $dataMap.events
        // NOTE: Do not remove it from $gameMap._events! will cause crash
        $gameMap.eraseEvent(target._eventId);
        // move dead mobs so it won't block the door
        let moveMob = function (target) {
          target.setPosition(-10, -10);
          $gameMap._events[target._eventId] = null;
          $dataMap.events[target._eventId] = null;
        }
        setTimeout(moveMob.bind(null, target), 500);
      }
    }
  }

  BattleUtils.meleeAttack = function (src, target) {
    var realSrc = BattleUtils.getRealTarget(src);
    var realTarget = BattleUtils.getRealTarget(target);
    if (src == $gamePlayer) {
      if (realSrc._tp < 5) {
        MapUtils.displayMessage('你氣喘吁吁, 沒有足夠的體力攻擊!');
        return;
      } else {
        realSrc.gainTp(-5);
      }
    }
    // calculate the damage
    var skillBonus = 0;
    if (realSrc._equips && realSrc._equips[0].itemId() != 0 && realSrc._skills) {
      var weapon = $dataWeapons[realSrc._equips[0].itemId()];
      switch (weapon.wtypeId) {
        case 2: // sword
          for (var id in realSrc._skills) {
            var skillId = realSrc._skills[id];
            if ($dataSkills[skillId].name == "劍術") {
              var prop = JSON.parse($dataSkills[skillId].note);
              if (!$gameVariables[0].player.skillExp[skillId]) {
                $gameVariables[0].player.skillExp[skillId] = {};
                $gameVariables[0].player.skillExp[skillId].lv = 1;
                $gameVariables[0].player.skillExp[skillId].exp = 1;
              }
              var index = $gameVariables[0].player.skillExp[skillId].lv - 1;
              skillBonus = prop.effect[index].atk;
              $gameVariables[0].player.skillExp[skillId].exp++;
              if (prop.effect[index].levelUp != -1 && $gameVariables[0].player.skillExp[skillId].exp >= prop.effect[index].levelUp) {
                $gameMessage.add('你的' + $dataSkills[skillId].name + '更加熟練了!');
                $gameVariables[0].player.skillExp[skillId].lv++;
                $gameVariables[0].player.skillExp[skillId].exp = 0;
              }
            }
          }
          break;
      }
    }
    var max = Math.round(realSrc.param(2) + realSrc.param(10) - realTarget.param(8));
    max = (max > 0) ? max : 1;
    var min = Math.round(max / 3);
    min = (min > 0) ? min : 1;
    var value = getRandomIntRange(min, max);
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('meleeAttack'), LogUtils.getCharName(realSrc.name())
      , LogUtils.getCharName(realTarget.name()), value));
    realTarget._hp -= value;
    // hit animation
    TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 16));
    BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    if (src == $gamePlayer) {
      playerAttacked = true;
      TimeUtils.afterPlayerMoved();
    }
  }

  BattleUtils.fire = function(src, distance) {

  }

  BattleUtils.playerDied = function (msg) {
    // TODO: implement statistics data/log
    $gameMessage.add(msg);
    var waitFunction = function () {
      if ($gameMessage.isBusy()) {
        setTimeout(waitFunction, 100);
      } else {
        SceneManager.goto(Scene_Gameover);
      }
    }
    setTimeout(waitFunction, 100);
  }

  //-----------------------------------------------------------------------------------
  // ItemUtils
  //
  // deal with item related methods
  ItemUtils = function () {
    throw new Error('This is a static class');
  }

  ItemUtils.tempObjStack = []; // for get/drop items log
  ItemUtils.displayObjStack = function(stack) {
    let items = {};
    for (var id in stack) {
      let obj = stack[id];
      let displayName = ItemUtils.getItemDisplayName(obj);
      if (items[displayName]) {
        items[displayName]++;
      } else {
        items[displayName] = 1;
      }
    }
    let msg = '';
    for (var id in items) {
      if (1 == items[id]) {
        msg += id;
      } else {
        msg += id + 'x' + items[id];
      }
      msg += ', ';
    }
    return msg.substring(0, msg.length - 2);
  }

  ItemUtils.findMapItemPileEvent = function (x, y) {
    let events = $gameMap.eventsXy(x, y);
    for (let id in events) {
      let event = events[id];
      if (event.type == 'ITEM_PILE') {
        return event;
      }
    }
    return null;
  }

  ItemUtils.addItemToSet = function (toAdd, itemSet, weaponSet, armorSet) {
    if (DataManager.isItem(toAdd)) {
      itemSet.push(toAdd);
    } else if (DataManager.isWeapon(toAdd)) {
      weaponSet.push(toAdd)
    } else if (DataManager.isArmor(toAdd)) {
      armorSet.push(toAdd);
    }
  }

  ItemUtils.addItemToItemPile = function (x, y, item) {
    let itemPileEvent = ItemUtils.findMapItemPileEvent(x, y);
    let itemPile;
    if (!itemPileEvent) {
      itemPile = new ItemPile(x, y);
      itemPileEvent = new Game_ItemPile(x, y);
      itemPileEvent.itemPile = itemPile;
    } else {
      itemPile = itemPileEvent.itemPile;
    }
    ItemUtils.addItemToSet(item, itemPile.items, itemPile.weapons, itemPile.armors);
    // setup object stack
    itemPile.objectStack.push(item);
    ItemUtils.updateItemPile(itemPileEvent);
  }

  ItemUtils.removeItemFromItemPile = function (x, y, item) {
    let itemPileEvent = ItemUtils.findMapItemPileEvent(x, y);
    let itemPile = itemPileEvent.itemPile;
    var listToCheck;
    if (DataManager.isItem(item)) {
      listToCheck = itemPile.items;
    } else if (DataManager.isWeapon(item)) {
      listToCheck = itemPile.weapons;
    } else if (DataManager.isArmor(item)) {
      listToCheck = itemPile.armors;
    }
    // remove object from list
    for (var id in listToCheck) {
      if (listToCheck[id].name == item.name) {
        listToCheck.splice(id, 1);
        break;
      }
    }
    for (var id in itemPile.objectStack) {
      if (itemPile.objectStack[id].name == item.name) {
        itemPile.objectStack.splice(id, 1);
        break;
      }
    }
    ItemUtils.updateItemPile(itemPileEvent);
  }

  ItemUtils.identifyObject = function(item) {
    let prop = JSON.parse(item.note);
    switch (prop.type) {
      case 'POTION': case 'SCROLL': case 'BOOK':
        // write to global database
        SetUtils.add(prop.type + '_' + item.id, $gameVariables[0].identifiedObjects);
        break;
      case 'FOOD': case 'SKILL':
        // no need to identify
        break;
      default:
        // identify individually
        item.isIdentified = true;
        break;
    }
  }

  ItemUtils.checkItemIdentified = function(item) {
    let prop = JSON.parse(item.note);
    switch (prop.type) {
      case 'POTION': case 'SCROLL': case 'BOOK':
        // check global database
        if (SetUtils.has(prop.type + '_' + item.id, $gameVariables[0].identifiedObjects)) {
          return true;
        } else {
          return false;
        }
      case 'FOOD': case 'SKILL':
        // no need to identify
        return true;
      default:
        // identify individually
        if (item.isIdentified) {
          return true;
        } else {
          return false;
        }
    }
  }

  ItemUtils.getItemDisplayName = function(item) {
    let displayName;
    if (ItemUtils.checkItemIdentified(item)) {
      displayName = item.name;
    } else {
      let prop = JSON.parse(item.note);
      switch (prop.type) {
        case 'POTION': case 'SCROLL': case 'BOOK':
          displayName = $gameVariables[0].itemImageData.items[item.id].name;
          break;
        case 'WEAPON':
          displayName = $gameVariables[0].itemImageData.weapons[item.id].name;
          break;
        case 'ARMOR':
          displayName = $gameVariables[0].itemImageData.armors[item.id].name;
          break;
      }
    }
    return displayName;
  }

  ItemUtils.getItemFullName = function(item) {
    return item.name + item.description;
  }

  ItemUtils.showNumberWithSign = function(value) {
    return ((value > 0) ? '\\c[24]+' + value : '\\c[25]' + value) + '\\c[0]';
  }

  ItemUtils.updateEquipDescription = function(item) {
    let result = '\n';
    for (let i = 0; i < 8; i++) {
      if (item.params[i] != 0) {
        switch (i) {
          case 0:
            result += 'HP';
            break;
          case 1:
            result += 'MP';
            break;
          case 2:
            result += '力量';
            break;
          case 3:
            result += '體格';
            break;
          case 4:
            result += '智力';
            break;
          case 5:
            result += '睿智';
            break;
          case 6:
            result += '敏捷';
            break;
          case 7:
            result += '運氣';
            break;
        }
        result += ItemUtils.showNumberWithSign(item.params[i]) + ' ';
      }
    }
    for (let id in item.traits) {
      let attr = item.traits[id];
      if (attr.code == 22 && attr.value != 0) {
        switch (attr.dataId) {
          case 0:
            result += '護甲強度';
            break;
          case 1:
            result += '魔法抗性';
            break;
          case 2:
            result += '武器威力';
            break;
        }
        result += ItemUtils.showNumberWithSign(Math.round(attr.value * 100)) + ' ';
      }
    }
    item.description = item.description.split('\n')[0] + result;
  }

  ItemUtils.updateEquipName = function(equip) {
    let temp = equip.name.split(']');
    let name = (temp.length == 1) ? temp[0] : temp[1];
    if (equip.bucState == 1) {
      name = '[祝福]' + name;
    } else if (equip.bucState == -1) {
      name = '[詛咒]' + name;
    }
    equip.name = name;
  }

  ItemUtils.modifyAttr = function(trait, value) {
    trait.value += (value / 100);
    trait.value = Math.round(trait.value * 100) / 100;
  }

  ItemUtils.getImageData = function(obj) {
    let imageData;
    if (DataManager.isItem(obj)) {
      imageData = $gameVariables[0].itemImageData.items[obj.id];
    } else if (DataManager.isWeapon(obj)) {
      imageData = $gameVariables[0].itemImageData.weapons[obj.id];
    } else if (DataManager.isArmor(obj)) {
      imageData = $gameVariables[0].itemImageData.armors[obj.id];
    } else {
      console.log('ERROR: ItemUtils.updateItemPile: no such type!');
    }
    return imageData;
  }

  ItemUtils.updateItemPile = function(event) {
    let erased = false;
    if ($gameVariables[$gameMap._mapId].mapData[event._x][event._y].isVisible) {
      if (event.itemPile.objectStack.length == 0) {
        $gameMap._events[event._eventId] = null;
        $dataMap.events[event._eventId] = null;
        erased = true;
      } else {
        let obj = event.itemPile.objectStack[event.itemPile.objectStack.length - 1];
        let imageData = ItemUtils.getImageData(obj);
        // setup image
        event._originalPattern = imageData.pattern;
        event.setPattern(imageData.pattern);
        event.setDirection(imageData.direction);
        event.setImage(imageData.image, imageData.imageIndex);
        event.setOpacity(255);
        // setup last image
        event.itemPile.lastImage = imageData;
      }
    } else {
      // show last image player saw
      event._originalPattern = event.itemPile.lastImage.pattern;
      event.setPattern(event.itemPile.lastImage.pattern);
      event.setDirection(event.itemPile.lastImage.direction);
      event.setImage(event.itemPile.lastImage.image, event.itemPile.lastImage.imageIndex);
      event.setOpacity(128);
    }
    if (!erased) {
      event.updateDataMap();
    }
  }

  ItemUtils.getEnchantment = function(item) {
    let temp = item.name.split(/\+|-/);
    if (temp.length == 1) {
      return 0;
    } else {
      let value = parseInt(temp[1]);
      if (item.name[temp[0].length] == '-') {
        return value * -1;
      } else {
        return value;
      }
    }
  }

  ItemUtils.enchantEquip = function(equip, value) {
    let temp = equip.name.split(/\+|-/);
    let nowValue = 0;
    if (temp.length != 1) {
      let value2 = parseInt(temp[1]);
      if (equip.name[temp[0].length] == '-') {
        nowValue = value2 * -1;
      } else {
        nowValue = value2;
      }
    }
    nowValue += value;
    let newName = temp[0];
    if (nowValue > 0) {
      newName += '+' + nowValue;
    } else if (nowValue < 0) {
      newName += '-' + nowValue;
    }
    equip.name = newName;
    let prop = JSON.parse(equip.note);
    for (let id in equip.traits) {
      let toCheck = equip.traits[id];
      if (toCheck.code == 22) {
        if (prop.type == 'WEAPON' && toCheck.dataId == 2) {
          ItemUtils.modifyAttr(toCheck, value);
        } else if (prop.type == 'ARMOR' && toCheck.dataId == 0) {
          ItemUtils.modifyAttr(toCheck, value);
        }
        break;
      }
    }
    ItemUtils.updateEquipDescription(equip);
  }

  //-----------------------------------------------------------------------------------
  // ItemTemplate
  //
  // class for MV items instance, for OOP purpose

  ItemTemplate = function() {
    this.initialize.apply(this, arguments);
  }

  ItemTemplate.prototype.constructor = ItemTemplate;

  ItemTemplate.prototype.initialize = function (template) {
    let clone = cloneObject(template);
    for (let id in clone) {
      this[id] = clone[id];
    }
    this.bucState = 0; // 0: uncursed, -1: cursed, 1: blessed
  };

  //-----------------------------------------------------------------------------------
  // Sword
  //
  // weapon id 1

  Sword = function() {
    this.initialize.apply(this, arguments);
  }

  Sword.prototype = Object.create(ItemTemplate.prototype);
  Sword.prototype.constructor = Sword;

  Sword.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataWeapons[1]);
    // randomize attributes
    let modifier = getRandomIntRange(0, 5);
    ItemUtils.modifyAttr(this.traits[1], modifier);
    ItemUtils.updateEquipDescription(this);
    // randomize bucState
    this.bucState = getRandomIntRange(-1, 2);
    ItemUtils.updateEquipName(this);
  };

  //-----------------------------------------------------------------------------------
  // Shield
  //
  // armor id 1

  Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Shield.prototype = Object.create(ItemTemplate.prototype);
  Shield.prototype.constructor = Shield;

  Shield.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataArmors[1]);
    // randomize attributes
    let modifier = getRandomIntRange(-1, 2);
    ItemUtils.modifyAttr(this.traits[0], modifier);
    ItemUtils.updateEquipDescription(this);
  };

  //-----------------------------------------------------------------------------------
  // Potion_Heal
  //
  // item id 31

  Potion_Heal = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Heal.prototype = Object.create(ItemTemplate.prototype);
  Potion_Heal.prototype.constructor = Potion_Heal;

  Potion_Heal.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[31]);
  }

  Potion_Heal.prototype.onQuaff = function(user) {
    TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 45));
    let realUser = BattleUtils.getRealTarget(user);
    let value = 50;
    realUser.setHp(realUser._hp + value);
    TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', value));
    if ($gameVariables[$gameMap._mapId].mapData[user._x][user._y].isVisible) {
      let msg = String.format(Message.display('quaffPotionHeal'), LogUtils.getCharName(realUser.name())
        , value);
      LogUtils.addLog(msg);
      ItemUtils.identifyObject(this);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Mana
  //
  // item id 32

  Potion_Mana = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Mana.prototype = Object.create(ItemTemplate.prototype);
  Potion_Mana.prototype.constructor = Potion_Mana;

  Potion_Mana.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[32]);
  }

  Potion_Mana.prototype.onQuaff = function(user) {
    TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 45));
    let realUser = BattleUtils.getRealTarget(user);
    let value = 20;
    realUser.setMp(realUser._mp + value);
    TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', value));
    if ($gameVariables[$gameMap._mapId].mapData[user._x][user._y].isVisible) {
      let msg = String.format(Message.display('quaffPotionMana'), LogUtils.getCharName(realUser.name())
        , value);
      ItemUtils.identifyObject(this);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_Identify
  //
  // item id 51

  Scroll_Identify = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_Identify.prototype = Object.create(ItemTemplate.prototype);
  Scroll_Identify.prototype.constructor = Scroll_Identify;

  Scroll_Identify.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[51]);
  }

  Scroll_Identify.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let items = $gameParty.allItems().filter(function(item){
        return !ItemUtils.checkItemIdentified(item) && item.name != '鑑定卷軸';
      });
      let msg;
      if (items.length > 0) {
        let toIdentify = items[getRandomInt(items.length)];
        let unknownName = ItemUtils.getItemDisplayName(toIdentify);
        ItemUtils.identifyObject(toIdentify);
        ItemUtils.identifyObject(this);
        msg = String.format(Message.display('scrollIdentifyRead'), unknownName, toIdentify.name);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_EnchantArmor
  //
  // item id 52

  Scroll_EnchantArmor = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_EnchantArmor.prototype = Object.create(ItemTemplate.prototype);
  Scroll_EnchantArmor.prototype.constructor = Scroll_EnchantArmor;

  Scroll_EnchantArmor.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[52]);
  }

  Scroll_EnchantArmor.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let equips = $gameActors._data[1].equips().filter(function(item) {
        if (item) {
          let prop = JSON.parse(item.note);
          return prop.type && prop.type == 'ARMOR';
        }
        return false;
      });
      let msg;
      if (equips.length > 0) {
        let equip = equips[getRandomInt(equips.length)];
        let nowValue = ItemUtils.getEnchantment(equip);
        if (nowValue >= 5) {
          // armor destroyed
          msg = String.format(Message.display('scrollEnchantArmorReadEvaporate'), equip.name);
          for (let id in $gameActors._data[1]._equips) {
            if ($gameActors._data[1]._equips[id]._item == equip) {
              $gameActors._data[1]._equips[id] = new Game_Item();
              break;
            }
          }
        } else {
          if (nowValue >= 3) {
            msg = String.format(Message.display('scrollEnchantArmorReadDanger'), equip.name);
          } else {
            msg = String.format(Message.display('scrollEnchantArmorRead'), equip.name);
          }
          ItemUtils.enchantEquip(equip, 1);
        }
        ItemUtils.identifyObject(this);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_EnchantWeapon
  //
  // item id 53

  Scroll_EnchantWeapon = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_EnchantWeapon.prototype = Object.create(ItemTemplate.prototype);
  Scroll_EnchantWeapon.prototype.constructor = Scroll_EnchantWeapon;

  Scroll_EnchantWeapon.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[53]);
  }

  Scroll_EnchantWeapon.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let equips = $gameActors._data[1].equips().filter(function(item) {
        if (item) {
          let prop = JSON.parse(item.note);
          return prop.type && prop.type == 'WEAPON';
        }
        return false;
      });
      let msg;
      if (equips.length > 0) {
        let equip = equips[getRandomInt(equips.length)];
        let nowValue = ItemUtils.getEnchantment(equip);
        if (nowValue >= 5) {
          // weapon destroyed
          msg = String.format(Message.display('scrollEnchantWeaponReadEvaporate'), equip.name);
          for (let id in $gameActors._data[1]._equips) {
            if ($gameActors._data[1]._equips[id]._item == equip) {
              $gameActors._data[1]._equips[id] = new Game_Item();
              break;
            }
          }
        } else {
          if (nowValue >= 3) {
            msg = String.format(Message.display('scrollEnchantWeaponReadDanger'), equip.name);
          } else {
            msg = String.format(Message.display('scrollEnchantWeaponRead'), equip.name);
          }
          ItemUtils.enchantEquip(equip, 1);
        }
        ItemUtils.identifyObject(this);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_RemoveCurse
  //
  // item id 54

  Scroll_RemoveCurse = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_RemoveCurse.prototype = Object.create(ItemTemplate.prototype);
  Scroll_RemoveCurse.prototype.constructor = Scroll_RemoveCurse;

  Scroll_RemoveCurse.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[54]);
  }

  Scroll_RemoveCurse.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let equips = $gameActors._data[1].equips().filter(function(item) {
        if (item) {
          return item.bucState == -1;
        }
        return false;
      });
      let msg;
      if (equips.length > 0) {
        let equip = equips[getRandomInt(equips.length)];
        msg = String.format(Message.display('scrollRemoveCurseRead'), equip.name);
        equip.bucState = 0;
        ItemUtils.updateEquipName(equip);
        ItemUtils.identifyObject(this);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_Teleport
  //
  // item id 55

  Scroll_Teleport = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_Teleport.prototype = Object.create(ItemTemplate.prototype);
  Scroll_Teleport.prototype.constructor = Scroll_Teleport;

  Scroll_Teleport.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[55]);
  }

  Scroll_Teleport.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let floors = MapUtils.findMapDataFloor($gameVariables[$gameMap._mapId].mapData);
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob($gameMap._mapId, floor.x, floor.y) && (floor.x != $gamePlayer._x && floor.y != $gamePlayer._y)) {
          $gamePlayer.setPosition(floor.x, floor.y);
          let screenX = ($gamePlayer._x - 10.125 < 0) ? 0 : $gamePlayer._x - 10.125;
          screenX = (screenX + 20 > $gameMap.width()) ? $gameMap.width() - 20 : screenX;
          let screenY = ($gamePlayer._y - 7.75 < 0) ? 0 : $gamePlayer._y - 7.75;
          screenY = (screenY + 17 > $gameMap.height()) ? $gameMap.height() - 17 : screenY;
          $gameMap._displayX = screenX;
          $gameMap._displayY = screenY;
          AudioManager.playSe({name: "Run", pan: 0, pitch: 100, volume: 100});
          MapUtils.refreshMap();
          // show on map objs
          showObjsOnMap();
          break;
        }
      }
      LogUtils.addLog(Message.display('scrollTeleportRead'));
      ItemUtils.identifyObject(this);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_DestroyArmor
  //
  // item id 56

  Scroll_DestroyArmor = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_DestroyArmor.prototype = Object.create(ItemTemplate.prototype);
  Scroll_DestroyArmor.prototype.constructor = Scroll_DestroyArmor;

  Scroll_DestroyArmor.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[56]);
  }

  Scroll_DestroyArmor.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let equips = $gameActors._data[1].equips().filter(function(item) {
        if (item) {
          let prop = JSON.parse(item.note);
          return prop.type && prop.type == 'ARMOR';
        }
        return false;
      });
      let msg;
      if (equips.length > 0) {
        let equip = equips[getRandomInt(equips.length)];
        msg = String.format(Message.display('scrollDestroyArmorRead'), equip.name);
        for (let id in $gameActors._data[1]._equips) {
          if ($gameActors._data[1]._equips[id]._item == equip) {
            $gameActors._data[1]._equips[id] = new Game_Item();
            break;
          }
        }
        ItemUtils.identifyObject(this);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_CreateMonster
  //
  // item id 57

  Scroll_CreateMonster = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_CreateMonster.prototype = Object.create(ItemTemplate.prototype);
  Scroll_CreateMonster.prototype.constructor = Scroll_CreateMonster;

  Scroll_CreateMonster.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[57]);
  }

  Scroll_CreateMonster.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let blocks = MapUtils.findAdjacentBlocks($gamePlayer);
      let msg, targetFloor;
      while (blocks.length > 0) {
        let id = getRandomInt(blocks.length);
        let floor = blocks[id];
        if (MapUtils.isTileAvailableForMob($gameMap._mapId, floor.x, floor.y)) {
          targetFloor = floor;
          break;
        } else {
          blocks.splice(id, 1);
        }
      }
      if (targetFloor) {
        // TODO: implement mob generating method
        new Bat(targetFloor.x, targetFloor.y);
        MapUtils.refreshMap();
        // show on map objs
        showObjsOnMap();
        msg = Message.display('scrollCreateMonsterRead');
        ItemUtils.identifyObject(this);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.displayMessage(msg);
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_ScareMonster
  //
  // item id 58

  Scroll_ScareMonster = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_ScareMonster.prototype = Object.create(ItemTemplate.prototype);
  Scroll_ScareMonster.prototype.constructor = Scroll_ScareMonster;

  Scroll_ScareMonster.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[58]);
  }

  Scroll_ScareMonster.prototype.onRead = function(user) {
    if (user == $gameParty) {
      let msg = Message.display('scrollScareMonsterRead');
      LogUtils.addLog(msg);
      let seeMonsterScared = false;
      for (let id in $gameMap._events) {
        let evt = $gameMap._events[id];
        if (evt && evt.type == 'MOB' && MapUtils.getDistance(evt._x, evt._y, $gamePlayer._x, $gamePlayer._y) <= 10) {
          evt.mob.afraidCount = 20;
          if ($gameVariables[$gameMap._mapId].mapData[evt._x][evt._y].isVisible) {
            LogUtils.addLog(String.format(Message.display('monsterFlee'), evt.mob.name()));
            seeMonsterScared = true;
          }
        }
      }
      if (seeMonsterScared) {
        ItemUtils.identifyObject(this);
      }
      MapUtils.displayMessage(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Window_GetDropItemList
  //
  // class for items on the map, inherit from Window_ItemList
  function Window_GetDropItemList() {
    this.initialize.apply(this, arguments);
  }

  Window_GetDropItemList.prototype = Object.create(Window_ItemList.prototype);
  Window_GetDropItemList.prototype.constructor = Window_GetDropItemList;

  Window_GetDropItemList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  // always return true, because every item can be got/dropped
  Window_GetDropItemList.prototype.isEnabled = function (item) {
    return true;
  };

  //-----------------------------------------------------------------------------------
  // Scene_OnMapItem
  //
  // handle the action when trying to pick up item from the ground
  Scene_OnMapItem = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_OnMapItem.prototype = Object.create(Scene_Item.prototype);
  Scene_OnMapItem.prototype.constructor = Scene_OnMapItem;

  Scene_OnMapItem.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
    // indicates if player really moved
    this.moved = false;
    var itemPile = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y).itemPile;
    // modify $gameParty items, will change it back when scene closed
    this.tempItems = $gameParty._items;
    this.tempWeapons = $gameParty._weapons;
    this.tempArmors = $gameParty._armors;

    $gameParty._items = itemPile.items;
    $gameParty._weapons = itemPile.weapons;
    $gameParty._armors = itemPile.armors;

    ItemUtils.tempObjStack.length = 0;
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_OnMapItem.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this, so we can change $gameParty items back when popScene
  Scene_OnMapItem.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('請選擇要撿起的物品.', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popSceneAndRestoreItems.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_OnMapItem.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('請選擇要撿起的物品.', 0, 0);
  }

  Scene_OnMapItem.prototype.popSceneAndRestoreItems = function () {
    // restore $gameParty items
    $gameParty._items = this.tempItems;
    $gameParty._weapons = this.tempWeapons;
    $gameParty._armors = this.tempArmors;
    SceneManager.pop();
    if (this.moved) {
      LogUtils.addLog(String.format(Message.display('getItems'), ItemUtils.displayObjStack(ItemUtils.tempObjStack)));
      ItemUtils.tempObjStack.length = 0;
      setTimeout('TimeUtils.afterPlayerMoved();', 100);
    }
  }

  Scene_OnMapItem.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      this.moved = true;
      // remove item from the ground
      $gameParty.loseItem(this.item(), 1);
      // setup item stacks
      let itemPileEvent = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y);
      var itemPile = itemPileEvent.itemPile;
      for (var i in itemPile.objectStack) {
        if (itemPile.objectStack[i] == this.item()) {
          itemPile.objectStack.splice(i, 1);
          break;
        }
      }
      // setup item to 'temp', which means real $gameParty
      ItemUtils.addItemToSet(this.item(), this.tempItems, this.tempWeapons, this.tempArmors);
      ItemUtils.tempObjStack.push(this.item());
      ItemUtils.updateItemPile(itemPileEvent);
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  //-----------------------------------------------------------------------------------
  // Scene_DropItem
  //
  // handle the action when trying to drop items from player inventory
  Scene_DropItem = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_DropItem.prototype = Object.create(Scene_Item.prototype);
  Scene_DropItem.prototype.constructor = Scene_DropItem;

  Scene_DropItem.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
    // indicates if player really moved
    this.moved = false;
    ItemUtils.tempObjStack.length = 0;
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_DropItem.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this to show hint message
  Scene_DropItem.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('請選擇要丟下的物品.', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_DropItem.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('請選擇要丟下的物品.', 0, 0);
  }

  Scene_DropItem.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      this.moved = true;
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      // setup item to itemPile on the ground
      ItemUtils.addItemToItemPile($gamePlayer._x, $gamePlayer._y, this.item());
      ItemUtils.tempObjStack.push(this.item());
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  Scene_DropItem.prototype.popScene = function () {
    Scene_Item.prototype.popScene.call(this);
    if (this.moved) {
      LogUtils.addLog(String.format(Message.display('dropItems'), ItemUtils.displayObjStack(ItemUtils.tempObjStack)));
      ItemUtils.tempObjStack.length = 0;
      setTimeout('TimeUtils.afterPlayerMoved();', 100);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scene_Item
  //
  // override the useItem method, so it take turns
  Scene_Item.prototype.useItem = function () {
    Scene_ItemBase.prototype.useItem.call(this);
    SceneManager.goto(Scene_Map);
    setTimeout('TimeUtils.afterPlayerMoved();', 100);
  };

  //-----------------------------------------------------------------------------------
  // Game_BattlerBase
  //
  // override the param() method, so it can show our desired attributes
  Game_BattlerBase.prototype.param = function (paramId) {
    if (paramId < 8) {
      var value = this.paramBase(paramId) + this.paramPlus(paramId);
      value *= this.paramRate(paramId) * this.paramBuffRate(paramId);
      var maxValue = this.paramMax(paramId);
      var minValue = this.paramMin(paramId);
      return Math.round(value.clamp(minValue, maxValue));
    } else {
      return Math.round(this.xparam(paramId - 8) * 100);
    }
  };

  // add properties to Player/Mobs
  Game_BattlerBase.prototype.initialize = function () {
    this.initMembers();
    this.lastTimeMoved = ($gameVariables[0] && $gameVariables[0].gameTime) ? $gameVariables[0].gameTime : 0;
  };

  //-----------------------------------------------------------------------------------
  // Window_Status
  //
  // override this to show our desired attributes name
  Window_Status.prototype.drawParameters = function (x, y) {
    var lineHeight = this.lineHeight();
    for (var i = 0; i < attributeNum; i++) {
      var paramId = i + 2;
      var y2 = y + lineHeight * i;
      this.changeTextColor(this.systemColor());
      this.drawText(TextManager.param(paramId), x, y2, 160);
      this.resetTextColor();
      this.drawText(this._actor.param(paramId), x + 160, y2, 60, 'right');
    }
  };

  Window_Status.prototype.refresh = function () {
    this.contents.clear();
    if (this._actor) {
      var lineHeight = this.lineHeight();
      this.drawBlock1(lineHeight * 0);
      this.drawHorzLine(lineHeight * 1);
      this.drawBlock2(lineHeight * 2);
      this.drawHorzLine(lineHeight * 6);
      this.drawBlock3(lineHeight * 7);
      this.drawHorzLine(lineHeight * (7 + attributeNum));
      this.drawBlock4(lineHeight * (8 + attributeNum));
    }
  };

  //-----------------------------------------------------------------------------------
  // Window_EquipStatus
  //
  // override this to show our desired attributes when equipping
  Window_EquipStatus.prototype.refresh = function () {
    this.contents.clear();
    if (this._actor) {
      this.drawActorName(this._actor, this.textPadding(), 0);
      for (var i = 0; i < attributeNum; i++) {
        this.drawItem(0, this.lineHeight() * (1 + i), 2 + i);
      }
    }
  };

  Window_EquipStatus.prototype.numVisibleRows = function () {
    return attributeNum + 1;
  };

  // do not show status if equip unidentified
  Window_EquipStatus.prototype.drawItem = function(x, y, paramId) {
    this.drawParamName(x + this.textPadding(), y, paramId);
    if (this._actor) {
      this.drawCurrentParam(x + 140, y, paramId);
    }
    this.drawRightArrow(x + 188, y);
    if (this._tempActor) {
      let identified = true;
      for (let id in this._tempActor._equips) {
        let item = this._tempActor._equips[id]._item;
        if (item && !item.isIdentified) {
          identified = false;
          break;
        }
      }
      if (identified) {
        this.drawNewParam(x + 222, y, paramId);
      }
    }
  };

  //-----------------------------------------------------------------------------------
  // Scene_Equip
  // 
  // override this to judge if player really changed equipment, then update time
  Scene_Equip.prototype.onItemOk = function () {
    let success = this.actor().changeEquip(this._slotWindow.index(), this._itemWindow.item());
    if (success) {
      SoundManager.playEquip();
      this._slotWindow.activate();
      this._slotWindow.refresh();
      this._itemWindow.deselect();
      this._itemWindow.refresh();
      this._statusWindow.refresh();
      SceneManager.goto(Scene_Map);
      setTimeout('TimeUtils.afterPlayerMoved();', 100);
    } else {
      SceneManager.goto(Scene_Map);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_EquipCommand
  //
  // The window for selecting a command on the equipment screen.

  // modify this to disable optimize & clear
  Window_EquipCommand.prototype.makeCommandList = function() {
    this.addCommand(TextManager.equip2,   'equip');
  };

  //-----------------------------------------------------------------------------------
  // Window_SkillList
  //
  // override this to show player skill lv
  Window_SkillList.prototype.drawItemName = function (item, x, y, width) {
    width = width || 312;
    if (item) {
      var skillLv = ($gameVariables[0].player.skillExp[item.id]) ? $gameVariables[0].player.skillExp[item.id].lv : 1;
      var iconBoxWidth = Window_Base._iconWidth + 4;
      this.resetTextColor();
      this.drawIcon(item.iconIndex, x + 2, y + 2);
      this.drawText(item.name + 'Lv' + skillLv, x + iconBoxWidth, y, width - iconBoxWidth);
    }
  };

  //-----------------------------------------------------------------------------------
  // Game_Party
  //
  // override this to implement item instances
  Game_Party.prototype.initAllItems = function () {
    this._items = [];
    this._weapons = [];
    this._armors = [];
  };

  Game_Party.prototype.items = function () {
    return this._items;
  };

  Game_Party.prototype.weapons = function () {
    return this._weapons;
  };

  Game_Party.prototype.armors = function () {
    return this._armors;
  };

  Game_Party.prototype.numItems = function (item) {
    var container = this.itemContainer(item);
    if (container) {
      var num = 0;
      for (var i in container) {
        if ((ItemUtils.getItemFullName(item) == ItemUtils.getItemFullName(container[i]))
          && (item.isIdentified == container[i].isIdentified)) {
          num++;
        }
      }
      return num;
    }
    return 0;
  };

  Game_Party.prototype.gainItem = function (item, amount, includeEquip) {
    var container = this.itemContainer(item);
    if (container) {
      if (amount > 0) {
        // only deal with +1
        container.push(item);
      } else {
        // only deal with -1
        for (let id in container) {
          if (container[id] == item) {
            container.splice(id, 1);
            break;
          }
        }
      }
      $gameMap.requestRefresh();
    }
  };

  //-----------------------------------------------------------------------------------
  // DataManager
  //
  // override this to implement item instances
  DataManager.isItem = function (item) {
    return item && item.itypeId && item.itypeId == 1;
  };

  DataManager.isWeapon = function (item) {
    return item && item.etypeId && item.etypeId == 1;
  };

  DataManager.isArmor = function (item) {
    return item && item.etypeId && item.etypeId != 1;
  };

  //-----------------------------------------------------------------------------
  // Window_Base
  //
  // override this to show unidentified name

  Window_Base.prototype.drawItemName = function(item, x, y, width) {
    width = width || 312;
    if (item) {
        var iconBoxWidth = Window_Base._iconWidth + 4;
        this.resetTextColor();
        this.drawIcon(item.iconIndex, x + 2, y + 2);
        this.drawText(ItemUtils.getItemDisplayName(item), x + iconBoxWidth, y, width - iconBoxWidth);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_Help
  //
  // The window for displaying the description of the selected item.
  // override this to show unidentified objects

  Window_Help.prototype.setItem = function(item) {
    if (item) {
      if (ItemUtils.checkItemIdentified(item)) {
        this.setText(item.description);
      } else {
        this.setText(Message.display('unIdentified'));
      }
    } else {
      this.setText('');
    }
  };

  //-----------------------------------------------------------------------------------
  // Window_ItemList
  //
  // override this to show item instances
  Window_ItemList.prototype.makeItemList = function () {
    var objList = $gameParty.allItems().filter(function (item) {
      return this.includes(item);
    }, this);
    this._data = [];
    for (var i in objList) {
      var added = false;
      for (var j in this._data) {
        if ((ItemUtils.getItemFullName(this._data[j]) == ItemUtils.getItemFullName(objList[i]))
          && (this._data[j].isIdentified == objList[i].isIdentified)) {
          added = true;
          break;
        }
      }
      if (!added) {
        this._data.push(objList[i]);
      }
    }
    if (this.includes(null)) {
      this._data.push(null);
    }
  };

  //-----------------------------------------------------------------------------------
  // Window_FoodList
  //
  // class for items on the map, inherit from Window_ItemList
  function Window_FoodList() {
    this.initialize.apply(this, arguments);
  }

  Window_FoodList.prototype = Object.create(Window_ItemList.prototype);
  Window_FoodList.prototype.constructor = Window_FoodList;

  Window_FoodList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_FoodList.prototype.includes = function (item) {
    try {
      var prop = JSON.parse(item.note);
      return prop.type && prop.type == "FOOD";
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_FoodList.prototype.isEnabled = function(item) {
    return true;
  };

  //-----------------------------------------------------------------------------------
  // Scene_EatFood
  //
  // handle the action when eating
  Scene_EatFood = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_EatFood.prototype = Object.create(Scene_Item.prototype);
  Scene_EatFood.prototype.constructor = Scene_EatFood;

  Scene_EatFood.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
    // move food on the ground to player inventory temporarily
    var itemPileEvent = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y);
    if (itemPileEvent) {
      let itemPile = itemPileEvent.itemPile;
      for (var id in itemPile.items) {
        var item = itemPile.items[id];
        if (Window_FoodList.prototype.includes(item)) {
          // add to inventory temporarily
          item.name += groundWord;
          $gameParty._items.push(item);
        }
      }
    }
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_EatFood.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_FoodList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this to show hint message
  Scene_EatFood.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('你想吃什麼?', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_EatFood.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('你想吃什麼?', 0, 0);
  }

  Scene_EatFood.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      if (this.item().name.includes(groundWord)) {
        ItemUtils.removeItemFromItemPile($gamePlayer._x, $gamePlayer._y, this.item());
      }
      this.popScene();
      var func = function (item) {
        TimeUtils.afterPlayerMoved(3 * $gameVariables[0].gameTimeAmp);
        $gameMessage.add("你吃完了" + item.name + ".");
        // TODO: implement eating effect
      }
      setTimeout(func.bind(null, this.item()), 100);
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  // move food on the ground back
  Scene_EatFood.prototype.popScene = function () {
    Scene_Item.prototype.popScene.call(this);
    var allDone = false;
    while (!allDone) {
      allDone = true;
      for (var id in $gameParty._items) {
        var item = $gameParty._items[id];
        if (item.name.includes(groundWord)) {
          $gameParty.loseItem(item, 1);
          item.name = item.name.substring(0, item.name.length - 4);
          allDone = false;
          break;
        }
      }
    }
  }

  //-----------------------------------------------------------------------------------
  // Window_PotionList
  //
  // class for potions, inherit from Window_ItemList
  function Window_PotionList() {
    this.initialize.apply(this, arguments);
  }

  Window_PotionList.prototype = Object.create(Window_ItemList.prototype);
  Window_PotionList.prototype.constructor = Window_PotionList;

  Window_PotionList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_PotionList.prototype.includes = function (item) {
    try {
      var prop = JSON.parse(item.note);
      return prop.type && prop.type == "POTION";
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_PotionList.prototype.isEnabled = function(item) {
    return true;
  };

  //-----------------------------------------------------------------------------------
  // Scene_QuaffPotion
  //
  // handle the action when quaffing
  Scene_QuaffPotion = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_QuaffPotion.prototype = Object.create(Scene_Item.prototype);
  Scene_QuaffPotion.prototype.constructor = Scene_QuaffPotion;

  Scene_QuaffPotion.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_QuaffPotion.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_PotionList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this to show hint message
  Scene_QuaffPotion.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('你想喝什麼?', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_QuaffPotion.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('你想喝什麼?', 0, 0);
  }

  Scene_QuaffPotion.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      this.popScene();
      var func = function (item) {
        LogUtils.addLog(String.format(Message.display('quaffPotion'), ItemUtils.getItemDisplayName(item)));
        item.onQuaff($gamePlayer);
        var func2 = function() {
          if (!$gameVariables[0].messageFlag) {
            TimeUtils.afterPlayerMoved();
            return;
          }
          setTimeout(func2, 10);
        }
        func2();
      }
      setTimeout(func, 100, this.item());
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  //-----------------------------------------------------------------------------------
  // Window_ScrollList
  //
  // class for scrolls, inherit from Window_ItemList
  function Window_ScrollList() {
    this.initialize.apply(this, arguments);
  }

  Window_ScrollList.prototype = Object.create(Window_ItemList.prototype);
  Window_ScrollList.prototype.constructor = Window_ScrollList;

  Window_ScrollList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_ScrollList.prototype.includes = function (item) {
    try {
      var prop = JSON.parse(item.note);
      return prop.type && prop.type == "SCROLL";
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_ScrollList.prototype.isEnabled = function(item) {
    return true;
  };

  //-----------------------------------------------------------------------------------
  // Scene_ReadScroll
  //
  // handle the action when reading a scroll
  Scene_ReadScroll = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_ReadScroll.prototype = Object.create(Scene_Item.prototype);
  Scene_ReadScroll.prototype.constructor = Scene_ReadScroll;

  Scene_ReadScroll.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_ReadScroll.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_ScrollList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this to show hint message
  Scene_ReadScroll.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('你想朗誦什麼?', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_ReadScroll.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('你想朗誦什麼?', 0, 0);
  }

  Scene_ReadScroll.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      this.popScene();
      var func = function (item) {
        LogUtils.addLog(String.format(Message.display('readScroll'), ItemUtils.getItemDisplayName(item)));
        item.onRead($gameParty);
        var func2 = function() {
          if (!$gameVariables[0].messageFlag) {
            TimeUtils.afterPlayerMoved();
            return;
          }
          setTimeout(func2, 10);
        }
        func2();
      }
    }
    setTimeout(func, 100, this.item());
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  //-----------------------------------------------------------------------------------
  // Window_ProjectileList
  //
  // class for potions, inherit from Window_ItemList
  function Window_ProjectileList() {
    this.initialize.apply(this, arguments);
  }

  Window_ProjectileList.prototype = Object.create(Window_ItemList.prototype);
  Window_ProjectileList.prototype.constructor = Window_ProjectileList;

  Window_ProjectileList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_ProjectileList.prototype.includes = function (item) {
    try {
      var prop = JSON.parse(item.note);
      return prop.type && prop.type == "POTION";
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_ProjectileList.prototype.isEnabled = function(item) {
    return true;
  };

  //-----------------------------------------------------------------------------------
  // Scene_FireProjectile
  //
  // handle the action when quaffing
  Scene_FireProjectile = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_FireProjectile.prototype = Object.create(Scene_Item.prototype);
  Scene_FireProjectile.prototype.constructor = Scene_FireProjectile;

  Scene_FireProjectile.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_FireProjectile.prototype.createItemWindow = function () {
    var wy = this._categoryWindow.y + this._categoryWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_PotionList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
    this.addWindow(this._itemWindow);
    this._categoryWindow.setItemWindow(this._itemWindow);
  };

  // override this to show hint message
  Scene_FireProjectile.prototype.createCategoryWindow = function () {
    this._categoryWindow = new Window_ItemCategory();
    this._categoryWindow.setHelpWindow(this._helpWindow);
    this._helpWindow.drawTextEx('你想投擲什麼?', 0, 0);
    this._categoryWindow.y = this._helpWindow.height;
    this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
    this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._categoryWindow);
  };

  // override this to show hint message
  Scene_FireProjectile.prototype.onItemCancel = function () {
    Scene_Item.prototype.onItemCancel.call(this);
    this._helpWindow.drawTextEx('你想投擲什麼?', 0, 0);
  }

  Scene_FireProjectile.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      $gameVariables[0].fireProjectileInfo.item = this.item();
      this.popScene();
      var func = function () {
        $gameVariables[0].directionalAction = Projectile_Potion.prototype.createProjectile;
        $gameVariables[0].directionalFlag = true;
        MapUtils.displayMessage('往哪個方向投擲?');
      }
      setTimeout(func, 100);
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  //-----------------------------------------------------------------------------
  // Game_Actor
  //
  // The game object class for an actor.

  // identify item by equip, deal with cursed item
  Game_Actor.prototype.changeEquip = function(slotId, item) {
    // deal with curse
    if (this.equips()[slotId] && this.equips()[slotId].bucState == -1) {
      AudioManager.playSe({name: "Buzzer1", pan: 0, pitch: 100, volume: 100});
      setTimeout(function(item) {
        let msg = String.format(Message.display('changeEquipCursed'), item.name);
        LogUtils.addLog(msg);
        MapUtils.displayMessage(msg);
      }, 100, this.equips()[slotId]);
      return false;
    }
    if (item && !item.isIdentified) {
      item.isIdentified = true;
      let array = $gameParty.allItems();
      for (let id in array) {
        if (ItemUtils.getItemFullName(array[id]) == ItemUtils.getItemFullName(item)) {
          array[id].isIdentified = true;
        }
      }
    }
    let msg = '';
    if (this.equips()[slotId]) {
      msg += String.format(Message.display('removeEquip'), this.equips()[slotId].name);
    }
    if (this.tradeItemWithParty(item, this.equips()[slotId])
      && (!item || this.equipSlots()[slotId] === item.etypeId)) {
      this._equips[slotId].setObject(item);
      this.refresh();
    }
    if (item) {
      msg += String.format(Message.display('wearEquip'), item.name);
    }
    LogUtils.addLog(msg);
    return true;
  };

  //-----------------------------------------------------------------------------
  // Game_Item
  //
  // The game object class for handling skills, items, weapons, and armor. It is
  // required because save data should not include the database object itself.
  // override to create object instances

  Game_Item.prototype.initialize = function(item) {
    this._dataClass = '';
    this._itemId = 0;
    this._item = null;
    if (item) {
      this.setObject(item);
      this._item = item;
    }
  };

  Game_Item.prototype.object = function() {
    return this._item;
  };

  Game_Item.prototype.setObject = function(item) {
      this._item = item;
      this._itemId = item ? item.id : 0;
  };

  //-----------------------------------------------------------------------------
  // SceneManager
  //
  // The static class that manages scene transitions.

  // modify this to show objs on map when pop scene
  SceneManager.pop = function() {
    if (this._stack.length > 0) {
      this.goto(this._stack.pop());
    } else {
      this.exit();
    }
    setTimeout(showObjsOnMap, 100);
  };
})();
