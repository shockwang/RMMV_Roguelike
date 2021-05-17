// my plugin

(function () {
  var MapData = function(floorId, original, x, y) {
    this.base = floorId;
    // command those variables for storage size issue, and also not used yet
    // this.bush = 0;
    // this.decorate1 = 0;
    // this.decorate2 = 0;
    // this.shadow = 0;
    // this.region = 0;

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
    this.secretBlocks = {};
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

  var ProjectileData = function(skill, imageName, imageIndex, distance, hitCharFunc, hitDoorFunc, hitWallFunc) {
    this.skill = skill;
    this.imageName = imageName;
    this.imageIndex = imageIndex;
    this.distance = distance;
    this.hitCharFunc = hitCharFunc;
    this.hitDoorFunc = hitDoorFunc;
    this.hitWallFunc = hitWallFunc;
  }

  var TargetInSightData = function(directionX, directionY, distance) {
    this.directionX = directionX;
    this.directionY = directionY;
    this.distance = distance;
  }

  var RouteData = function(mapBlock, weight) {
    this.mapBlock = mapBlock;
    this.weight = weight;
  }

  var DisplacementData = function(moveFunc, param1, param2) {
    this.moveFunc = moveFunc;
    this.param1 = param1;
    this.param2 = param2;
  }

  var FLOOR = '□';
  var WALL = '■';
  var DOOR = 'Ｄ';

  // ----------map constants----------
  var ceilingCenter = 6752;
  var floorCenter = 2816;
  var warFogCenter = 3536;

  var dungeonDepth = 9;

  // door figures
  var doorClosedIcon = 512;
  var doorOpenedIcon = 528;

  // room parameters
  var roomNum = 3, minRoomSize = 4, maxRoomSize = 16;
  var roomPercentage = 0.6;
  var doorPercentage = 1;
  var secretDoorPercentage = 0.3;
  var removeDeadEndPercentage = 1;
  var mobSpawnPercentage = 0.02;
  var mobRespawnPercentage = 0.3;
  var trapSpawnPercentage = 0.02;
  var itemSpawnPercentage = 0.02;

  // game parameters
  var throwItemTpCost = 3;
  var attackTpCost = 5;
  var dashTpCost = 20;
  var walkTpRecover = 3;
  var restTpRecover = 6;
  var mobTraceRouteMaxDistance = 15;

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
    // potion
    result.potions = [];
    result.potions.push(new ImageData('Collections1', 0, 0, 6, '紅色燒瓶'));
    result.potions.push(new ImageData('Collections1', 0, 1, 6, '橙色燒瓶'));
    result.potions.push(new ImageData('Collections1', 0, 2, 6, '黃色燒瓶'));
    result.potions.push(new ImageData('Collections1', 1, 0, 6, '藍色燒瓶'));
    result.potions.push(new ImageData('Collections1', 1, 1, 6, '紫色燒瓶'));
    result.potions.push(new ImageData('Collections1', 1, 2, 6, '綠色燒瓶'));
    result.potions.push(new ImageData('Collections1', 2, 0, 6, '灰色燒瓶'));
    result.potions.push(new ImageData('Collections1', 2, 1, 6, '紅色試管'));
    result.potions.push(new ImageData('Collections1', 2, 2, 6, '澄色試管'));
    result.potions.push(new ImageData('Collections1', 3, 0, 6, '黃色試管'));
    result.potions.push(new ImageData('Collections1', 3, 1, 6, '藍色試管'));
    result.potions.push(new ImageData('Collections1', 3, 2, 6, '紫色試管'));
    shuffle(result.potions, 0, result.potions.length - 1);

    // scroll
    result.scrolls = [];
    for (let i = 0; i <= 8; i++) {
      result.scrolls[i] = new ImageData('Collections3', 3, 1, 4, '卷軸: ' + genScrollName());
    }

    result.items = [];
    // food
    result.items[11] = new ImageData('Meat', 0, 2, 2);
    result.items[14] = new ImageData('Outside_B1', 0, 0, 6);
    // material
    result.items[12] = new ImageData('Collections3', 0, 1, 2); // feather
    // projectile
    result.items[13] = new ImageData('Collections1', 7, 1, 8); // dart
  
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
      shootProjectile: '{0}發射了{1}!',
      projectileAttack: '{0}的{1}對{2}造成了{3}點傷害.',
      targetKilled: '{0}被{1}殺死了!',
      targetDied: '{0}死了...',
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
      throwItemHitObstacle: '{0}撞到障礙物, 落在地上.',
      throwItemBroken: '{0}壞掉了!',
      monsterFlee: '{0}轉身逃跑!',
      recoverFromAfraid: '{0}恢復鎮定了.',
      bumpWall: '{0}撞在牆上.',
      bumpDoor: '{0}撞在門上.',
      blind: '{0}失去視覺了!',
      recoverFromBlind: '{0}的視覺恢復了.',
      paralyze: '{0}麻痺了!',
      recoverFromParalyze: '{0}又能夠行動了.',
      sleep: '{0}陷入了沉睡.',
      recoverFromSleep: '{0}醒了過來.',
      speedUp: '{0}的速度突然加快了!',
      speedUpEnd: '{0}的速度慢了下來.',
      growth: '{0}的{1}提昇了!',
      levelUp: '{0}的等級提昇了!',
      invisible: '{0}的身形消失了!',
      invisibleEnd: '{0}的身形浮現出來了.',
      seeInvisible: '{0}可以察覺隱形的事物了.',
      seeInvisibleEnd: '{0}察覺隱形事物的能力消失了.',
      acidDamage: '{0}受到了{1}點酸蝕傷害!',
      equipAcidDamage: '{0}的{1}受到了酸的侵蝕!',
      poison: '{0}中毒了!',
      recoverFromPoison: '{0}從毒素中恢復了.',
      poisonDamage: '{0}受到了{1}點毒素傷害.',
      somebody: '某人',
      secretDoorDiscovered: '你發現了一扇隱藏的門!',
      absorbSoul: '你從{0}身上吸收了{1}!',
      damageSkillPerformed: '{0}對{1}使出了{2}, 造成{3}點傷害!',
      nonDamageSkillPerformed: '{0}發動了{1}!',
      bumpIntoWall: '{0}撞到牆壁, 受到了{1}點傷害.',
      bumpIntoDoor: '{0}撞開了一扇門!',
      bumpKnockBack: '{0}被擊退了!',
      bumpKnockFaint: '{0}被擊退並撞到後方障礙物而昏迷了!',
      bleeding: '{0}出血了!',
      recoverFromBleeding: '{0}的出血停止了.',
      bleedingDamage: '{0}受到了{1}點出血傷害.',
      faint: '{0}昏迷了.',
      recoverFromFaint: '{0}從昏迷中醒來.',
      breakArmor: '{0}的護甲被穿透了!',
      breakArmorRecovered: '{0}的護甲強度恢復了.',
      skillEffectEnd: '{0}身上{1}的效果消失了.',
      attackOutOfEnergy: '{0}想發動攻擊, 但是沒有足夠的體力!',
      askDirection: '往哪個方向?',
      attackAir: '{0}對空氣發動了{1}.',
      self: '自己',
      player: '你',
      hotkeyUndefined: '未定義的熱鍵.',
      spikeTrapTriggered: '{0}一腳踩上尖刺陷阱, 受到{1}點傷害!',
      teleportTrapTriggered: '{0}一腳踩入了傳送陷阱.',
      seeTeleportAway: '{0}突然從你眼前消失了!',
      seeTeleportAppear: '{0}突然出現在你面前!',
      secretTrapDiscovered: '你找到了一個隱藏的{0}.',
      groundHoleTrapTriggered: '{0}失足掉入地洞陷阱, 受到{1}點傷害!',
      climbOutFailed: '{0}嘗試爬出地洞, 但是失敗了.',
      climbOutSuccess: '{0}爬出了地洞.',
      magicTrapTriggered: '{0}觸動了魔法陷阱!',
      eatWhenFull: '你吃的太飽了.',
      eatingDone: '你吃完了{0}.',
      foodRot: '你身上的{0}腐爛了...',
      foodRotAway : '你身上{0}徹底分解了.',
      foodRotGround: '地上的{0}腐爛了...',
      foodRotAwayGround: '地上{0}徹底分解了.',
      rotten: '腐爛的',
      rottenDescription: '它腐爛了...',
      eatRottenEffected: '你吃了腐爛的食物, 感到十分難受!',
      eatRottenUneffected: '你的身體能夠消化腐爛的食物.',
      nutritionUpToFull: '你吃得太撐了!',
      nutritionUpToNormal: '你不再感到飢餓了.',
      nutritionDownToNormal: '你的肚子不那麼撐了.',
      nutritionUpToHungry: '你現在僅僅感到飢餓.',
      nutritionDownToHungry: '你感覺肚子餓了.',
      nutritionUpToWeak: '你感覺身體的機能恢復了少許.',
      nutritionDownToWeak: '你餓到身體開始虛弱了...',
      nutritionDownToFaint: '你餓到意識不清, 再不吃點東西的話就死定了!',
      dieFromStarve: '{0}餓死了...',
      craftSceneHelpMessage: '你要進行什麼工作?',
      craftItemDone: '你製造了{0}.',
      notDirection: '這不是一個方向.',
      noStairDown: '這裡沒有往下的樓梯.',
      noStairUp: '這裡沒有往上的樓梯.',
      noItemGround: '這裡沒有東西可以撿.',
      noItemInventory: '你的身上沒有任何物品.',
      noEnergy: '你氣喘吁吁, 沒有足夠的體力攻擊!',
      noMana: '你的魔力不夠了...',
      skillLevelUp: '你的{0}更加熟練了!',
      noDoor: '這個方向沒有門哦.',
      doorOpened: '這扇門已經是打開的了.',
      doorClosed: '這扇門已經是關上的了.',
      doorLocked: '這扇門是鎖著的.',
      doorStucked: '這扇門被什麼卡住了, 關不起來.',
      strUp: '你的肌肉變得更強壯了!',
      strDown: '你的肌肉軟化了...',
      vitUp: '你的身體變得更結實了!',
      vitDown: '你的身體變得更脆弱了...',
      intUp: '你的思緒變得更清晰了!',
      intDown: '你的思緒變得更混濁了...',
      wisUp: '你變得更加睿智了!',
      wisDown: '你變得更加愚笨了...',
      agiUp: '你的動作變得更靈活了!',
      agiDown: '你的動作變得更笨拙了...',
      animalMeat: '{0}肉',
      helpMsg: '移動角色:\n'
        + '數字小鍵盤(2468: 下左右上, 1379: 左下、右下、左上、右上, 5:原地等待一回合)\n\n'
        + '戰鬥操作:\n'
        + '對著目標按移動鍵: 普通攻擊　　W: 發動戰技　　C: 施放魔法　　f: 投擲物品\n'
        + 'Q: 預設投射物\n\n'
        + '其他操作:\n'
        + '>: 向下走一層　　<: 向上走一層　　Enter: 走樓梯快捷鍵　　i: 查看物品欄\n'
        + 'g: 撿起地上物品　d: 丟下身上物品　o: 開門(或直接往門走)　c: 關上一扇門\n'
        + 'w: 穿脫裝備　　　e: 吃東西　　　　/: 查看紀錄　　　　　　r: 閱讀卷軸\n'
        + 'q: 飲用藥水　　　M: 合成物品　　　s: 搜尋隱藏門、陷阱　　S: 存檔頁面\n'
        + 'h/?: 開啟此頁面\n\n'
        + '快捷鍵系統:\n'
        + '打開戰技或魔法頁面, 在技能上按下鍵盤左側數字鍵0~9, 便可將該技能設定至該\n'
        + '數字, 接著在地圖畫面上按下該數字便可以直接施放技能. 在選定的技能上再按一\n'
        + '次快捷鍵可取消綁定.'
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
  // CharUtils
  //
  // character related methods

  CharUtils = function () {
    throw new Error('This is a static class');
  };
  CharUtils.mobTemplates = []; // save all mobs

  CharUtils.baseHp = 35;

  // initialize character status map
  CharUtils.initStatus = function() {
    var result = {
      blindCount: 0,
      paralyzeCount: 0,
      sleepCount: 0,
      poisonCount: 0,
      speedUpCount: 0,
      invisibleCount: 0,
      seeInvisibleCount: 0,
      afraidCount: 0,
      bleedingCount: 0,
      faintCount: 0,
      breakArmorCount: 0,
      groundHoleTrapped: false,
      skillEffect: [],
      bellyStatus: 'NORMAL' // FAINT, WEAK, HUNGRY, NORMAL, FULL
    }
    return result;
  }

  CharUtils.getTargetEffect = function(realSrc, skillClass) {
    for (let id in realSrc.status.skillEffect) {
      let skillEffect = realSrc.status.skillEffect[id];
      if (skillEffect.skill.constructor.name == skillClass.name) {
        return skillEffect;
      }
    }
    return null;
  }

  CharUtils.updateStatus = function(event) {
    let target = BattleUtils.getRealTarget(event);
    for (let id in target.status) {
      if (Number.isInteger(target.status[id]) && target.status[id] > 0) {
        target.status[id]--;
        if (id == 'poisonCount') {
          let value = 3;
          CharUtils.decreaseHp(target, value);
          if ($gameVariables[$gameMap._mapId].mapData[event._x][event._y].isVisible) {
            TimeUtils.animeQueue.push(new AnimeObject(event, 'POP_UP', -1 * value));
            LogUtils.addLog(String.format(Message.display('poisonDamage'), LogUtils.getCharName(target)
              , value));
          }
          BattleUtils.checkTargetAlive(null, target, event);
        } else if (id == 'bleedingCount') {
          let value = Math.round(target.mhp / 100);
          value = (value < 1) ? 1 : value;
          CharUtils.decreaseHp(target, value);
          if ($gameVariables[$gameMap._mapId].mapData[event._x][event._y].isVisible) {
            TimeUtils.animeQueue.push(new AnimeObject(event, 'POP_UP', -1 * value));
            LogUtils.addLog(String.format(Message.display('bleedingDamage'), LogUtils.getCharName(target)
              , value));
          }
          BattleUtils.checkTargetAlive(null, target, event);
        }
        if (target.status[id] == 0
          && (event == $gamePlayer || $gameVariables[$gameMap._mapId].mapData[event._x][event._y].isVisible)) {
          switch (id) {
            case 'afraidCount':
              LogUtils.addLog(String.format(Message.display('recoverFromAfraid')
                , LogUtils.getCharName(target)));
              break;
            case 'blindCount':
              LogUtils.addLog(String.format(Message.display('recoverFromBlind')
                , LogUtils.getCharName(target)));
              if (event == $gamePlayer) {
                $gameActors.actor(1).awareDistance = $gameActors.actor(1).originalAwareDistance;
              }
              break;
            case 'paralyzeCount':
              LogUtils.addLog(String.format(Message.display('recoverFromParalyze')
                , LogUtils.getCharName(target)));
              break;
            case 'sleepCount':
              LogUtils.addLog(String.format(Message.display('recoverFromSleep')
                , LogUtils.getCharName(target)));
              break;
            case 'speedUpCount':
              LogUtils.addLog(String.format(Message.display('speedUpEnd')
                , LogUtils.getCharName(target)));
              break;
            case 'invisibleCount':
              LogUtils.addLog(String.format(Message.display('invisibleEnd')
                , LogUtils.getCharName(target)));
              if (event == $gamePlayer) {
                $gamePlayer.setOpacity(255);
              }
              break;
            case 'seeInvisibleCount':
              LogUtils.addLog(String.format(Message.display('seeInvisibleEnd')
                , LogUtils.getCharName(target)));
              break;
            case 'poisonCount':
              LogUtils.addLog(String.format(Message.display('recoverFromPoison')
                , LogUtils.getCharName(target)));
              break;
            case 'faintCount':
              LogUtils.addLog(String.format(Message.display('recoverFromFaint')
                , LogUtils.getCharName(target)));
              break;
            case 'bleedingCount':
              LogUtils.addLog(String.format(Message.display('recoverFromBleeding')
                , LogUtils.getCharName(target)));
              break;
            case 'breakArmorCount':
              LogUtils.addLog(String.format(Message.display('breakArmorRecovered')
                , LogUtils.getCharName(target)));
              break;
          }
        }
      }
    }
    // update skill effects
    let i = target.status.skillEffect.length;
    while (i--) {
      let effect = target.status.skillEffect[i];
      effect.effectCount--;
      if (effect.effectCount == 0) {
        if (CharUtils.playerCanSeeChar(event)) {
          LogUtils.addLog(String.format(Message.display('skillEffectEnd'), LogUtils.getCharName(target)
            , effect.skill.name));
        }
        effect.effectEnd();
        target.status.skillEffect.splice(i, 1);
      }
    }
  }

  CharUtils.updateSleepCountWhenHit = function(target) {
    if (target.status.sleepCount > 0 && target.status.sleepCount <= 15) {
      // wake up when hit
      target.status.sleepCount = 0;
      LogUtils.addLog(String.format(Message.display('recoverFromSleep')
        , LogUtils.getCharName(target)));
    }
  }

  CharUtils.getActionTime = function(realTarget) {
    let result = Math.ceil(100 / realTarget.param(6) + 10);
    if (realTarget.status.speedUpCount > 0) {
      result = Math.ceil(result / 2);
    }
    return result;
  }

  CharUtils.levelUp = function(target) {
    // TODO: implement level up mechanism
    target._paramPlus[0] += 5 + Math.round(target.param(3) / 2);
    target._paramPlus[1] += 5 + Math.round(target.param(5) / 2);
  }

  CharUtils.canSee = function(src, target) {
    if (src.status.blindCount > 0) {
      return false;
    } else if (target.status.invisibleCount > 0 && src.status.seeInvisibleCount == 0) {
      return false;
    }
    return true;
  }

  CharUtils.playerCanSeeChar = function(target) {
    if (target == $gamePlayer) {
      return true;
    } else if ($gameVariables[$gameMap._mapId].mapData[target._x][target._y].isVisible
      && CharUtils.canSee($gameActors.actor(1), BattleUtils.getRealTarget(target))) {
      return true;
    }
    return false;
  }

  CharUtils.playerCanSeeBlock = function(x, y) {
    return $gameVariables[$gameMap._mapId].mapData[x][y].isVisible && $gameActors.actor(1).status.blindCount == 0;
  }

  CharUtils.updateHpMp = function(target) {
    // get hpAddFactor & hpMultiplyFactor, mpAddFactor, mpMultiplyFactor
    let hpAddFactor = (target.hpAddFactor) ? target.hpAddFactor : 0;
    let hpMultiplyFactor = (target.hpMultiplyFactor) ? target.hpMultiplyFactor : 0;
    let mpAddFactor = (target.mpAddFactor) ? target.mpAddFactor : 0;
    let mpMultiplyFactor = (target.mpMultiplyFactor) ? target.mpMultiplyFactor : 0;
    // setup HP & MP
    target._hp = Math.round(((CharUtils.baseHp + target.level * 5) * (1 + target.param(3) / 100) + hpAddFactor) * (1 + hpMultiplyFactor));
    target._paramPlus[0] = target._hp - target.param(0);
    target._mp = Math.round((CharUtils.baseHp * (1 + target.param(5) / 100) + mpAddFactor) * (1 + mpMultiplyFactor));
    target._paramPlus[1] = target._mp - target.param(1);
  }

  CharUtils.regenerate = function(target) {
    let realTarget = BattleUtils.getRealTarget(target);
    // regenerate HP
    var regenValue = Math.round(1 + realTarget.param(3) / 3);
    regenValue = getRandomIntRange(1, regenValue);
    realTarget.gainHp(regenValue);

    // regenerate MP
    regenValue = Math.round(1 + realTarget.param(5) / 3);
    regenValue = getRandomIntRange(1, regenValue);
    realTarget.gainMp(regenValue);
  }

  CharUtils.updateTp = function(target) {
    let realTarget = BattleUtils.getRealTarget(target);
    if (realTarget.attacked) {
      // huge movement, do nothing
    } else if (realTarget.moved) {
      realTarget.gainTp(walkTpRecover);
    } else {
      // target rest
      realTarget.gainTp(restTpRecover);
    }
  }

  CharUtils.spawnMob = function(dungeonLevel) {
    let pool = [];
    for (let id in CharUtils.mobTemplates) {
      let mobClass = CharUtils.mobTemplates[id];
      if (dungeonLevel >= mobClass.baseDungeonLevel
        && (getRandomInt(100) > (dungeonLevel - mobClass.baseDungeonLevel) * 10)) {
        pool.push(mobClass);
      }
    }
    if (pool.length > 0) {
      return pool[getRandomInt(pool.length)];
    }
    return null;
  }

  // for distance attack
  CharUtils.checkTargetReachable = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);

    let inLine = false;
    if (src._x == target._x) {
      inLine = true;
    } else {
      let m = (target._y - src._y) / (target._x - src._x);
      if (m == 0 || Math.abs(m) == 1) {
        inLine = true;
      }
    }
    if (inLine && MapUtils.checkVisible(src, realSrc.awareDistance, target._x, target._y
      , $gameVariables[$gameMap._mapId].mapData, true)) {
      let directionX = src._x, directionY = src._y;
      if (src._x > target._x) {
        directionX--;
      } else if (src._x < target._x) {
        directionX++;
      }
      if (src._y > target._y) {
        directionY--;
      } else if (src._y < target._y) {
        directionY++;
      }
      let deltaX = Math.abs(src._x - target._x);
      let deltaY = Math.abs(src._y - target._y);
      let distance = (deltaX > deltaY) ? deltaX : deltaY;
      return new TargetInSightData(directionX, directionY, distance);
    }
    return null;
  }

  CharUtils.decreaseNutrition = function(target) {
    let realTarget = BattleUtils.getRealTarget(target);
    let isPlayer = (realTarget == $gameActors.actor(1)) ? true : false;
    realTarget.nutrition--;
    if (realTarget.nutrition >= $gameVariables[0].satiety.full) {
      if (isPlayer) {
        switch (realTarget.status.bellyStatus) {
          case 'NORMAL': case 'HUNGRY': case 'WEAK': case 'FAINT':
            LogUtils.addLog(Message.display('nutritionUpToFull'));
            break;
        }
      }
      realTarget.status.bellyStatus = 'FULL';
    } else if (realTarget.nutrition >= $gameVariables[0].satiety.hungry) {
      if (isPlayer) {
        switch (realTarget.status.bellyStatus) {
          case 'FULL':
            LogUtils.addLog(Message.display('nutritionDownToNormal'));
            break;
          case 'HUNGRY': case 'WEAK': case 'FAINT':
            LogUtils.addLog(Message.display('nutritionUpToNormal'));
        }
      }
      realTarget.status.bellyStatus = 'NORMAL';
    } else if (realTarget.nutrition >= $gameVariables[0].satiety.weak) {
      if (isPlayer) {
        switch (realTarget.status.bellyStatus) {
          case 'FULL': case 'NORMAL':
            LogUtils.addLog(Message.display('nutritionDownToHungry'));
            break;
          case 'WEAK': case 'FAINT':
            LogUtils.addLog(Message.display('nutritionUpToHungry'));
            break;
        }
      }
      realTarget.status.bellyStatus = 'HUNGRY';
    } else if (realTarget.nutrition >= $gameVariables[0].satiety.faint) {
      if (isPlayer) {
        switch (realTarget.status.bellyStatus) {
          case 'FULL': case 'NORMAL': case 'HUNGRY':
            LogUtils.addLog(Message.display('nutritionDownToWeak'));
            break;
          case 'FAINT':
            LogUtils.addLog(Message.display('nutritionUpToWeak'));
            break;
        }
      }
      realTarget.status.bellyStatus = 'WEAK';
    } else {
      if (isPlayer) {
        switch (realTarget.status.bellyStatus) {
          case 'FULL': case 'NORMAL': case 'HUNGRY': case 'WEAK':
            LogUtils.addLog(Message.display('nutritionDownToFaint'));
            break;
        }
      }
      realTarget.status.bellyStatus = 'FAINT';
      // check if player die from starvation
      if (realTarget.nutrition < $gameVariables[0].satiety.starve) {
        if (isPlayer) {
          BattleUtils.playerDied(String.format(Message.display('dieFromStarve')
            , LogUtils.getCharName(realTarget)));
        }
      }
      // randomly apply faint status
      if (getRandomInt(100) < 20 && realTarget.status.faintCount == 0) {
        if (isPlayer) {
          LogUtils.addLog(String.format(Message.display('faint'), LogUtils.getCharName(realTarget)));
        }
        realTarget.status.faintCount = dice(1, 5);
      }
    }
  }

  CharUtils.decreaseHp = function(realTarget, value) {
    realTarget._hp -= value;
    if (realTarget == $gameActors.actor(1)) {
      CharUtils.playerGainVitExp(value);
    }
  }

  // TODO: check if magic hit target?
  CharUtils.decreaseMp = function(realTarget, value) {
    realTarget._mp -= value;
    if (realTarget == $gameActors.actor(1)) {
      CharUtils.playerGainWisExp(value);
    }
  }

  // TODO: check if war skill hit target?
  CharUtils.decreaseTp = function(realTarget, value) {
    realTarget._tp -= value;
    if (realTarget == $gameActors.actor(1)) {
      CharUtils.playerGainAgiExp(value);
    }
  }

  CharUtils.playerGainStrExp = function(value) {
    $gameVariables[0].paramsExperience.str += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.str >= 30 + $gameActors.actor(1)._paramPlus[2] * 2) {
      $gameActors.actor(1)._paramPlus[2]++;
      $gameVariables[0].paramsExperience.str = 0;
      let msg = Message.display('strUp');
      $gameMessage.add(msg);
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainVitExp = function(value) {
    $gameVariables[0].paramsExperience.vit += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.vit >= $gameActors.actor(1)._hp + $gameActors.actor(1)._paramPlus[3] * 5) {
      $gameActors.actor(1)._paramPlus[3]++;
      $gameVariables[0].paramsExperience.vit = 0;
      let msg = Message.display('vitUp');
      $gameMessage.add(msg);
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainIntExp = function(value) {
    $gameVariables[0].paramsExperience.int += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.int >= 10 + $gameActors.actor(1)._paramPlus[4] * 2) {
      $gameActors.actor(1)._paramPlus[4]++;
      $gameVariables[0].paramsExperience.int = 0;
      let msg = Message.display('intUp');
      $gameMessage.add(msg);
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainWisExp = function(value) {
    $gameVariables[0].paramsExperience.wis += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.wis >= $gameActors.actor(1)._mp + $gameActors.actor(1)._paramPlus[5] * 5) {
      $gameActors.actor(1)._paramPlus[5]++;
      $gameVariables[0].paramsExperience.wis = 0;
      let msg = Message.display('wisUp');
      $gameMessage.add(msg);
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainAgiExp = function(value) {
    $gameVariables[0].paramsExperience.agi += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.agi >= 200 + $gameActors.actor(1)._paramPlus[6] * 10) {
      $gameActors.actor(1)._paramPlus[6]++;
      $gameVariables[0].paramsExperience.agi = 0;
      let msg = Message.display('agiUp');
      $gameMessage.add(msg);
      LogUtils.addLog(msg);
    }
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
    for (var i = 0; i < dungeonDepth; i++) {
      $gameVariables[i + 1] = new MapVariable(null, null);
    }
    for (var i = 1; i < dungeonDepth; i++) {
      $gameVariables[i + 1].generateRandom = true;
    }
    $gameVariables[dungeonDepth].stairDownNum = 0;

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
    $gameVariables[0].gameTimeAmp = 20;
    // hunger related values
    $gameVariables[0].satiety = {
      full: 1200,
      hungry: 300,
      weak: 100,
      faint: 0,
      starve: -200
    }
    // define player params experience
    $gameVariables[0].paramsExperience = {
      str: 0,
      vit: 0,
      int: 0,
      wis: 0,
      agi: 0,
      luk: 0
    }
    // define player attributes
    $gameActors.actor(1).nutrition = 900;
    $gameActors.actor(1).status = CharUtils.initStatus();
    $gameActors.actor(1).originalAwareDistance = 8;
    $gameActors.actor(1).awareDistance = 8;
    $gameActors.actor(1).moved = false;
    $gameActors.actor(1).attacked = false;
    // initialize template events
    $gameVariables[0].templateEvents = {
      monster: $dataMap.events[3],
      door: $dataMap.events[4],
      projectile: $dataMap.events[5],
      itemPile: $dataMap.events[6],
      trap: $dataMap.events[7],
      goHome: $dataMap.events[1]
    }
    // define data images mapping
    $gameVariables[0].itemImageData = generateImageData();

    // define identified data pool
    $gameVariables[0].identifiedObjects = [];

    // temp data for projectile
    $gameVariables[0].fireProjectileInfo = {
      item: null,
      skillId: null
    }

    // initialize player HP & MP
    CharUtils.updateHpMp($gameActors.actor(1));

    // initialize hotkeys
    $gameVariables[0].hotkeys = [];
    for (let i = 0; i < 10; i++) {
      $gameVariables[0].hotkeys[i] = null;
    }
    // initialize default projectile, identify by item instance
    $gameVariables[0].defaultProjectile = null;

    // show status window
    SceneManager._scene._myWindow.show();

    // for test
    // for (let i = 0; i < 10; i++) {
    //   $gameParty.gainItem(new Scroll_Identify(), 1);
    //   $gameParty.gainItem(new Scroll_EnchantArmor(), 1);
    //   $gameParty.gainItem(new Scroll_EnchantWeapon(), 1);
    //   $gameParty.gainItem(new Scroll_RemoveCurse(), 1);
    //   $gameParty.gainItem(new Scroll_Teleport(), 1);
    //   $gameParty.gainItem(new Scroll_DestroyArmor(), 1);
    //   $gameParty.gainItem(new Scroll_CreateMonster(), 1);
    //   $gameParty.gainItem(new Scroll_ScareMonster(), 1);
    //   $gameParty.gainItem(new Potion_Heal(), 1);
    //   $gameParty.gainItem(new Potion_Mana(), 1);
    //   $gameParty.gainItem(new Potion_Blind(), 1);
    //   $gameParty.gainItem(new Potion_Paralyze(), 1);
    //   $gameParty.gainItem(new Potion_Sleep(), 1);
    //   $gameParty.gainItem(new Potion_Speed(), 1);
    //   $gameParty.gainItem(new Potion_Growth(), 1);
    //   $gameParty.gainItem(new Potion_LevelUp(), 1);
    //   $gameParty.gainItem(new Potion_Invisible(), 1);
    //   $gameParty.gainItem(new Potion_SeeInvisible(), 1);
    //   $gameParty.gainItem(new Potion_Acid(), 1);
    //   $gameParty.gainItem(new Potion_Poison(), 1);
    // }
    // $gameParty.gainItem(new Dog_Tooth(), 1);
    // for (let i = 0; i < 10; i++) {
    //   $gameParty.gainItem(new Dart_Lv1_T1(), 1);
    //   $gameParty.gainItem(new Potion_Invisible(), 1);
    // }
    // $gameParty.gainItem(new Dog_Helmet(), 1);
    // $gameParty.gainItem(new Dog_Coat(), 1);
    // $gameParty.gainItem(new Dog_Gloves(), 1);
    // $gameParty.gainItem(new Dog_Shoes(), 1);

    // $gameParty._items.push(new Soul_Bite());
    // Soul_Obtained_Action.learnSkill(Skill_Shield);
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
      let lines = msg.split('\n');
      for (let id in lines) {
        $gameVariables[0].logList.push(lines[id]);
      }
      if ($gameVariables[0].logList.length > LogUtils.lineLimit) {
        $gameVariables[0].logList.splice(0, $gameVariables[0].logList.length - LogUtils.lineLimit);
      }
    },
    getCharName: function(target) {
      if (target == $gameActors.actor(1)) {
        return Message.display('player');
      } else if (!CharUtils.canSee($gameActors.actor(1), target)) {
        return Message.display('somebody');
      } else {
        return target.name();
      }
    },
    getPerformedTargetName: function(src, target) {
      if (src == target) {
        return Message.display('self');
      } else {
        return this.getCharName(target);
      }
    },
    displayHelpWindow: function() {
      $gameVariables[0].messageFlag = true;
      logWindow.contents.clear();
      logWindow.drawTextEx(Message.display('helpMsg'), 0, 0);
      SceneManager._scene.addChild(logWindow);
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

  MapUtils.addBothLog = function(msg) {
    MapUtils.displayMessage(msg);
    LogUtils.addLog(msg);
  }

  // used when message console already exists on map
  MapUtils.updateMessage = function (msg) {
    messageWindow.contents.clear();
    messageWindow.drawTextEx(msg, 0, 0);
  }

  // used to judge visible/walkable tiles
  MapUtils.isTilePassable = function (mapId, x, y, tile) {
    if (tile == FLOOR || tile == DOOR) {
      if (!$gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)]
         || $gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed) {
        return true;
      }
    }
    return false;
  }

  MapUtils.getTileIndex = function(x, y) {
    return x + ',' + y;
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  };

  function dice(number, face) {
    let result = 0;
    for (let i = 0; i < number; i++) {
      result += getRandomInt(face) + 1;
    }
    return result;
  }

  function getRandomIntRange(min, max) {
    if (min == max) {
      return min;
    }
    return Math.floor(Math.random() * Math.floor(max - min)) + min;
  }

  // check if projectile can hit
  MapUtils.checkVisible = function(src, distance, x, y, mapData, checkMobFlag) {
    var visible = false;
    if (MapUtils.getDistance(src._x, src._y, x, y) <= distance) {
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
          if (!(path[i].x == x && path[i].y == y) && !(path[i].x == src._x && path[i].y == src._y)) {
            if (!MapUtils.isTilePassable($gameMap._mapId, path[i].x, path[i].y
              , mapData[path[i].x][path[i].y].originalTile)) {
              visible = false;
              break;
            } else {
              // check if there's closed door
              var events = $gameMap.eventsXy(path[i].x, path[i].y);
              for (var id in events) {
                if (events[id] instanceof Game_Door && events[id].status != 2) {
                  visible = false;
                  break;
                } else if (checkMobFlag && events[id].mob) {
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
          if (!MapUtils.isTilePassable($gameMap._mapId, x, i, mapData[x][i].originalTile)) {
            visible = false;
            break;
          } else {
            // check if there's closed door
            var events = $gameMap.eventsXy(x, i);
            for (var id in events) {
              if (events[id] instanceof Game_Door && events[id].status != 2) {
                visible = false;
                break;
              } else if (checkMobFlag && events[id].mob) {
                visible = false;
                break;
              }
            }
          }
        }
      }
    }
    return visible;
  }

  // this function should be called twice (src must be a Game_Event)
  function updateVisible(src, distance, x, y, mapData) {
    mapData[x][y].isVisible = MapUtils.checkVisible(src, distance, x, y, mapData);
  }

  function refineMapTile(rawData, x, y, centerTile) {
    let east = false, west = false, south = false, north = false;
    // check east
    if (x + 1 < rawData.length && rawData[x + 1][y] != WALL) {
      east = true;
    }
    // check west
    if (x - 1 >= 0 && rawData[x - 1][y] != WALL) {
      west = true;
    }
    // check north
    if (y - 1 >= 0 && rawData[x][y - 1] != WALL) {
      north = true;
    }
    // check south
    if (y + 1 < rawData.length && rawData[x][y + 1] != WALL) {
      south = true;
    }
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
    let msg = '';
    if (event) {
      msg = ItemUtils.displayObjStack(event.itemPile.objectStack);
    }
    // always show msg box, to avoid window lag (don't know why)
    MapUtils.displayMessageNonBlocking(msg);
  }

  MapUtils.translateMap = function (rawData, mapId) {
    var mapData = new Array(rawData.length);
    for (var i = 0; i < mapData.length; i++) {
      mapData[i] = new Array(rawData[0].length);
      for (var j = 0; j < rawData[0].length; j++) {
        mapData[i][j] = new MapData(floorCenter, rawData[i][j], i, j);
      }
    }

    // deal with tile IDs
    for (var j = 0; j < rawData[0].length; j++) {
      for (var i = 0; i < rawData.length; i++) {
        if (rawData[i][j] == FLOOR) {
          // skip the floor tunning
          continue;
        } else if (rawData[i][j] == WALL) {
          mapData[i][j].base = ceilingCenter;
        } else if (rawData[i][j] == DOOR) {
          if ($gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(i, j)]) {
            mapData[i][j].base = ceilingCenter;
          } else {
            new Game_Door(i, j);
          }
        }
      }
    }

    return mapData;
  };

  MapUtils.drawImage = function(event, imageData, opacity) {
    event._originalPattern = imageData.pattern;
    event.setPattern(imageData.pattern);
    event.setDirection(imageData.direction);
    event.setImage(imageData.image, imageData.imageIndex);
    event.setOpacity(opacity);
  }

  MapUtils.drawMap = function (mapData, mapArray) {
    var mapSize = mapData.length * mapData[0].length;
    // do not update item piles & doors
    for (var i = 0; i < mapSize * 2; i++) {
      mapArray[i] = 0;
    }
    for (var i = mapSize * 4; i < mapArray.length; i++) {
      mapArray[i] = 0;
    }

    // update visibility
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        updateVisible($gamePlayer, $gameActors.actor(1).awareDistance, i, j, mapData);
      }
    }

    var index = 0;
    var warFogOffset = mapSize;
    var stairOffset = mapSize * 2;
    var itemOffset = mapSize * 3;
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
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

    // draw doors
    for (var i in $gameMap.events()) {
      var event = $gameMap.events()[i];
      if (event instanceof Game_Door && mapData[event._x][event._y].isVisible) {
        var index = stairOffset + event._y * mapData.length + event._x;
        mapArray[index] = (event.status == 2) ? doorOpenedIcon : doorClosedIcon;
      }
    }
  }

  MapUtils.drawDoorWhenBlind = function(x, y) {
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    let stairOffset = mapData.length * mapData[0].length * 2;
    let index = stairOffset + y * mapData.length + x;
    let events = $gameMap.eventsXy(x, y);
    for (let id in events) {
      if (events[id] instanceof Game_Door) {
        $dataMap.data[index] = (events[id].status == 2) ? doorOpenedIcon : doorClosedIcon;
        break;
      }
    }
  }

  MapUtils.drawMob = function(mapData, event) {
    if (mapData[event._x][event._y].isVisible) {
      if (event.mob.status.invisibleCount > 0) {
        if (CharUtils.canSee($gameActors.actor(1), event.mob)) {
          event.setOpacity(128);
        } else {
          event.setOpacity(0);
        }
      } else {
        event.setOpacity(255);
      }
    }
  }

  MapUtils.drawEvents = function (mapData) {
    for (var i = 0; i < $gameMap.events().length; i++) {
      var event = $gameMap.events()[i];
      if (event.type == 'ITEM_PILE') {
        ItemUtils.updateItemPile(event);
      } else if (event.type == 'TRAP') {
        TrapUtils.drawTrap(event);
      } else if (event._x > 0 && event._y > 0 && mapData[event._x][event._y].isVisible) {
        if (event.mob) {
          MapUtils.drawMob(mapData, event);
        } else {
          event.setOpacity(255);
        }
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
      if (exists[i].type == 'MOB' || (exists[i].type == 'DOOR' && exists[i].status != 2)
        || exists[i].type == 'TRAP') {
        occupied = true;
      }
    }
    // check if player occupied
    if (mapId == $gameMap.mapId() && $gamePlayer.pos(x, y)) {
      occupied = true;
    }
    var tileAvailable = false;
    if (MapUtils.isTilePassable(mapId, x, y, $gameVariables[mapId].mapData[x][y].originalTile)) {
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
    // show on map objs
    showObjsOnMap();
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

  MapUtils.getDisplacementData = function(srcX, srcY, x, y) {
    let moveFunc = 'moveStraight';
    let param1 = 6, param2;
    if (srcX == x && srcY == y) {
      // target self
      moveFunc = '';
    } else if (srcX == x) {
      if (y - 1 == srcY) {
        param1 = 2;
      } else {
        param1 = 8;
      }
    } else if (srcY == y) {
      if (x - 1 == srcX) {
        param1 = 6;
      } else {
        param1 = 4;
      }
    } else {
      moveFunc = 'moveDiagonally';
      if (x - 1 == srcX) {
        if (y - 1 == srcY) {
          param1 = 6;
          param2 = 2;
        } else {
          param1 = 6;
          param2 = 8;
        }
      } else {
        if (y - 1 == srcY) {
          param1 = 4;
          param2 = 2;
        } else {
          param1 = 4;
          param2 = 8;
        }
      }
    }
    return new DisplacementData(moveFunc, param1, param2);
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
        } else if (genMap[i][j].northDoor && Math.random() < doorPercentage) {
          north = DOOR;
        } else {
          north = FLOOR;
        }
        map[i * 2 + index][j * 2 + 1 + index] = north;

        var east;
        if (genMap[i][j].eastWall) {
          east = WALL;
        } else if (genMap[i][j].eastDoor && Math.random() < doorPercentage) {
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

  MapUtils.removeDeadEnds = function(mapPixel) {
    for (let j = 0; j < mapPixel[0].length; j++) {
      for (let i = 0; i < mapPixel.length; i++) {
        if (mapPixel[i][j] == WALL) {
          continue;
        }
        let done, tempI = i, tempJ = j;
        let remove = (Math.random() < removeDeadEndPercentage);
        do {
          done = true;
          let links = [];
          for (let k = 0; k < 8; k++) {
            if (k % 2 == 1) {
              continue;
            }
            let coor = MapUtils.getNearbyCoordinate(tempI, tempJ, k);
            if ((coor.x >= 0 && coor.x < mapPixel.length) && (coor.y >= 0 && coor.y < mapPixel[0].length)
              && mapPixel[coor.x][coor.y] != WALL) {
              links.push(coor);
            }
          }
          if (links.length == 1 && remove) {
            // remove this deadend
            mapPixel[tempI][tempJ] = WALL;
            if (links.length == 1) {
              done = false;
              tempI = links[0].x, tempJ = links[0].y;
            }
          }
        } while (!done);
      }
    }
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

  // find route between two events (using Dijkstra's algorithm)
  MapUtils.findShortestRoute = function (x1, y1, x2, y2, maxPathLength) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var path = [], explored = [];

    explored.push(new RouteData(mapData[x1][y1], 0));
    let steps = 0, reached = false;
    while (steps < maxPathLength && !reached) {
      // find all elements fit now steps
      let toExpend = explored.filter(function(routeData) {
        return routeData.weight == steps;
      })
      steps++;
      // explore from point & update weight
      for (let id in toExpend) {
        if (reached) {
          break;
        }
        let node = toExpend[id];
        for (let i = 0; i < 8; i++) {
          let coordinate = MapUtils.getNearbyCoordinate(node.mapBlock.x, node.mapBlock.y, i);
          // check if node already exists
          let exists = explored.filter(function(routeData) {
            return routeData.mapBlock.x == coordinate.x && routeData.mapBlock.y == coordinate.y;
          })
          if (exists[0]) { // block already explored, check & update weight
            exists[0].weight = (steps < exists[0].weight) ? steps : exists[0].weight;
          } else { // block not exists, add to exploredList
            let mapBlock = mapData[coordinate.x][coordinate.y];
            let tile = mapBlock.originalTile;
            let weight = -1;
            if (tile == FLOOR) {
              // check if mob on it
              let mob = $gameMap.eventsXy(coordinate.x, coordinate.y).filter(function(evt) {
                return evt.type == 'MOB';
              })
              if (mob[0] && !(mob[0]._x == x2 && mob[0]._y == y2)) {
                // mob on it & it's not destination
                weight = -1;
              } else {
                weight = steps;
              }
            } else if (tile == DOOR) {
              let openedDoor = $gameMap.eventsXy(coordinate.x, coordinate.y).filter(function(evt) {
                return evt.type == 'DOOR' && evt.status == 2;
              })
              if (openedDoor[0]) {
                weight = steps;
              }
            }
            explored.push(new RouteData(mapBlock, weight));
            if (coordinate.x == x2 && coordinate.y == y2) {
              reached = true;
              break;
            }
          }
        }
      }
    }

    if (reached) {
      // rollback path
      path.push(explored[explored.length - 1]);
      while (steps > 1) {
        steps--;
        let nodes = explored.filter(function(routeData) {
          return routeData.weight == steps;
        })
        let nodesBefore = explored.filter(function(routeData) {
          return routeData.weight == steps - 1;
        })
        let nodeAfter = path[path.length - 1];
        let candidates = [];
        for (let id in nodes) {
          let node = nodes[id];
          for (let id2 in nodesBefore) {
            let nodeBefore = nodesBefore[id2];
            if (MapUtils.isNearBy(node.mapBlock.x, node.mapBlock.y, nodeAfter.mapBlock.x, nodeAfter.mapBlock.y) &&
              MapUtils.isNearBy(node.mapBlock.x, node.mapBlock.y, nodeBefore.mapBlock.x, nodeBefore.mapBlock.y)) {
              candidates.push(node);
            }
          }
        }
        path.push(candidates[getRandomInt(candidates.length)]);
      }
      path.reverse();
      return path;
    }
    return null;
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
    var rawMap = MapUtils.generateMapData(genMapRoomsFullMaze, 20, 10);
    rawMap = MapUtils.removeDeadEnds(rawMap);
    MapUtils.setupSecretDoor(mapId, rawMap);
    var newMapData = MapUtils.translateMap(rawMap, mapId);
    $dataMap.width = rawMap.length;
    $dataMap.height = rawMap[0].length;
    $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
    $gameVariables[mapId].mapData = newMapData;
    $gameVariables[mapId].rmDataMap = $dataMap;
  }

  MapUtils.generateNewMapMobs = function (mapId, floors) {
    let mobCounts = Math.floor(floors.length * mobSpawnPercentage);
    for (let i = 0; i < mobCounts; i++) {
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob(mapId, floor.x, floor.y)) {
          let mobClass = CharUtils.spawnMob(mapId);
          if (mobClass) {
            new mobClass(floor.x, floor.y);
          }
          break;
        }
      }
    }
  }

  MapUtils.addMobToNowMap = function() {
    let mapId = $gameMap._mapId;
    let floors = MapUtils.findMapDataFloor($gameVariables[mapId].mapData);
    let mapEvts = $gameMap.events();
    let nowMobCount = 0;
    for (let id in mapEvts) {
      if (mapEvts[id].type == 'MOB') {
        nowMobCount++;
      }
    }
    let mobNum = Math.floor(floors.length * mobSpawnPercentage * mobRespawnPercentage);
    if (nowMobCount < mobNum) {
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob(mapId, floor.x, floor.y)
          && !$gameVariables[mapId].mapData[floor.x][floor.y].isVisible) {
          // only generate mob out of player's sight
          let mobClass = CharUtils.spawnMob(mapId);
          if (mobClass) {
            new mobClass(floor.x, floor.y);
          }
          break;
        }
      }
    }
  }

  MapUtils.generateNewMapItems = function(mapId, floors) {
    let itemCount = Math.floor(floors.length * itemSpawnPercentage);
    for (let i = 0; i < itemCount; i++) {
      while (true) {
        let floor = floors[getRandomInt(floors.length)];
        // do not place item on trap that can cause position movement
        let evts = $gameMap.eventsXy(floor.x, floor.y);
        let trap;
        for (let id in evts) {
          if (evts[id].type == 'TRAP') {
            trap = evts[id];
            break;
          }
        }
        if (trap && trap instanceof Trap_Teleport) {
          // can not place item, do nothing
        } else {
          ItemUtils.addItemToItemPile(floor.x, floor.y, ItemUtils.spawnItem(mapId));
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

  MapUtils.setupSecretDoor = function(mapId, rawMap) {
    for (let j = 0; j < rawMap[0].length; j++) {
      for (let i = 0; i < rawMap.length; i++) {
        if (rawMap[i][j] == DOOR && Math.random() < secretDoorPercentage) {
          $gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(i, j)] = {
            isRevealed: false
          }
        }
      }
    }
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
            if (targetMapId == 2) {
              // do not generate upstair on dungeon level 1
              let stairList = $gameVariables[targetMapId].stairList;
              for (let id in stairList) {
                if (stairList[id].type == 0) {
                  stairList.splice(id, 1);
                  break;
                }
              }
            }
            $gamePlayer.reserveTransfer(targetMapId, nowStair.toX, nowStair.toY, 0, 2);
            MapUtils.transferNearbyMobs(nowMapId, targetMapId, nowStair.x, nowStair.y, nowStair.toX, nowStair.toY);

            // new mobs in map
            var setupEvents = function (nowMapId, targetMapId, nowStair) {
              if (SceneManager.isCurrentSceneStarted()) {
                let floors = MapUtils.findMapDataFloor($gameVariables[targetMapId].mapData);
                TrapUtils.generateTraps(targetMapId, floors);
                MapUtils.generateNewMapMobs(targetMapId, floors);
                MapUtils.generateNewMapItems(targetMapId, floors);
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
    let actor = $gameActors.actor(1);
    var moved = false;
    let positionChanged = true;
    var timeSpent = CharUtils.getActionTime(actor);
    // check trap
    if (actor.status.groundHoleTrapped) {
      positionChanged = false;
      moved = true;
      $gamePlayer.setDirection(d);
      if (Math.random() < 0.3) {
        LogUtils.addLog(String.format(Message.display('climbOutSuccess')
          , LogUtils.getCharName(actor)));
        actor.status.groundHoleTrapped = false;
      } else {
        LogUtils.addLog(String.format(Message.display('climbOutFailed')
          , LogUtils.getCharName(actor)));
      }
    } else if (this.canPass(this.x, this.y, d)) {
      if (Input.isPressed('shift')) {
        if (actor._tp < dashTpCost) {
          MapUtils.displayMessage('你跑不動了...');
          return;
        } else {
          CharUtils.decreaseTp(actor, dashTpCost);
          timeSpent /= 2;
          playerDashed = true;
        }
      }
      this._followers.updateMove();
      moved = true;
    } else if (actor.status.blindCount > 0) {
      let coordinate = Input.getNextCoordinate($gamePlayer, d.toString());
      if (!$gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].isExplored) {
        $gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].isExplored = true;
        let format;
        if ($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].originalTile == DOOR) {
          MapUtils.drawDoorWhenBlind(coordinate.x, coordinate.y);
          format = Message.display('bumpDoor');
        } else {
          format = Message.display('bumpWall');
        }
        let realSrc = BattleUtils.getRealTarget($gamePlayer);
        LogUtils.addLog(String.format(format, LogUtils.getCharName(realSrc)));
        moved = true;
      }
    }
    if (positionChanged) {
      Game_Character.prototype.moveStraight.call(this, d);
    }
    if (moved) {
      actor.moved = true;
      TimeUtils.afterPlayerMoved(timeSpent);
    }
  };

  Game_Player.prototype.moveDiagonally = function (horz, vert) {
    let actor = $gameActors.actor(1);
    var moved = false;
    let positionChanged = true;
    var timeSpent = CharUtils.getActionTime(actor);
    // check trap
    if (actor.status.groundHoleTrapped) {
      positionChanged = false;
      moved = true;
      $gamePlayer.setDirection(horz);
      if (Math.random() < 0.3) {
        LogUtils.addLog(String.format(Message.display('climbOutSuccess')
          , LogUtils.getCharName(actor)));
        actor.status.groundHoleTrapped = false;
      } else {
        LogUtils.addLog(String.format(Message.display('climbOutFailed')
          , LogUtils.getCharName(actor)));
      }
    } else if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
      if (Input.isPressed('shift')) {
        if (actor._tp < dashTpCost) {
          MapUtils.displayMessage('你跑不動了...');
          return;
        } else {
          CharUtils.decreaseTp(actor, dashTpCost);
          timeSpent /= 2;
          playerDashed = true;
        }
      }
      this._followers.updateMove();
      moved = true;
    } else if (actor.status.blindCount > 0) {
      let d;
      if (horz == 4) {
        if (vert == 8) {
          d = 7;
        } else if (vert == 2) {
          d = 1;
        }
      } else if (horz == 6) {
        if (vert == 8) {
          d = 9;
        } else if (vert == 2) {
          d = 3;
        }
      }
      let coordinate = Input.getNextCoordinate($gamePlayer, d.toString());
      if (!$gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].isExplored) {
        $gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].isExplored = true;
        if ($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y].originalTile == DOOR) {
          MapUtils.drawDoorWhenBlind(coordinate.x, coordinate.y);
          format = Message.display('bumpDoor');
        } else {
          format = Message.display('bumpWall');
        }
        let realSrc = BattleUtils.getRealTarget($gamePlayer);
        LogUtils.addLog(String.format(format, LogUtils.getCharName(realSrc)));
        moved = true;
      }
    }
    if (positionChanged) {
      Game_Character.prototype.moveDiagonally.call(this, horz, vert);
    }
    if (moved) {
      actor.moved = true;
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
      if (MapUtils.isTilePassable($gameMap.mapId(), x2, y2, mapData[x2][y2].originalTile)) {
        // check if there's event on target tile which priority is as same as player
        var canPass = true;
        for (var i = 0; i < $gameMap.events().length; i++) {
          var toCheck = $gameMap.events()[i];
          if (!toCheck._erased && toCheck._x == x2 && toCheck._y == y2 && toCheck._priorityType == 1) {
            canPass = false;
            break;
          }
        }
        // check player's position
        if ($gamePlayer.pos(x2, y2)) {
          canPass = false;
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
      if (MapUtils.isTilePassable($gameMap.mapId(), x, y
        , $gameVariables[$gameMap.mapId()].mapData[x][y].originalTile)) {
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
          MapUtils.drawMob($gameVariables[this._mapId].mapData, this._events[i]);
        } else if ($dataMap.events[i].type == 'DOOR') {
          this._events[i] = new Game_Door($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
        } else if ($dataMap.events[i].type == 'ITEM_PILE') {
          this._events[i] = new Game_ItemPile($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
          ItemUtils.updateItemPile(this._events[i]);
        } else if ($dataMap.events[i].type == 'TRAP') {
          this._events[i] = new window[$dataMap.events[i].trap.trapClass]($dataMap.events[i].x
            , $dataMap.events[i].y, $dataMap.events[i]);
          TrapUtils.drawTrap(this._events[i]);
        } else {
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

  //-----------------------------------------------------------------------------
  // Game_Enemy
  //
  // The game object class for an enemy.
  // Modify this class for mob instance, isolate them from the template

  Game_Enemy.prototype.initialize = function(enemyId, x, y, params, xparams) {
    Game_Battler.prototype.initialize.call(this);
    this._params = params;
    this._xparams = xparams;
    this.setup(enemyId, x, y);
  };

  Game_Enemy.prototype.name = function() {
    return this._name;
  };

  Game_Enemy.prototype.paramBase = function(paramId) {
    return this._params[paramId];
  };

  // overwrite this, so mobs can have their own [armor, magicResistance, weaponAtk]
  Game_Enemy.prototype.xparam = function(xparamId) {
    if (this._xparams) {
      if (xparamId == 2) {
        return this._xparams[xparamId];
      } else {
        return this._xparams[xparamId] / 100;
      }
    }
    return 0;
  }

  Game_Enemy.prototype.exp = function() {
    return this._exp;
  };

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

  Game_Mob.prototype.initialize = function (x, y, mobId, fromData, mobInitData) {
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
      this.mob = new Game_Enemy(mobId, x, y, mobInitData.params, mobInitData.xparams);
      this.mob._name = mobInitData.name;
      this.mob._exp = mobInitData.exp;
      this.mob.level = mobInitData.level;
      this.mob._tp = 100;
      this.mob.awareDistance = 10;
      this.mob.status = CharUtils.initStatus();
      this.mob._skills = [];
      this.mob.moved = false;
      this.mob.attacked = false;
      // find empty space for new event
      var eventId = MapUtils.findEmptyFromList($dataMap.events);
      $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.monster, eventId, x, y);
      this.initStatus($dataMap.events[eventId]);
      this.initStatus(this);
      this.initAttribute();
    }
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    $gameMap._events[eventId] = this;
  };

  Game_Mob.prototype.action = function () {
    // reset move check
    this.mob.moved = false;
    this.mob.attacked = false;
    TimeUtils.actionDone = true;
    // check if player is nearby
    let distance = MapUtils.getDistance(this._x, this._y, $gamePlayer._x, $gamePlayer._y);
    if (distance < 20) { // only update mobs in distance (for performance issue)
      // check trap
      if (this.mob.status.groundHoleTrapped) {
        this.mob.moved = true;
        if (Math.random() < 0.3) {
          if (CharUtils.playerCanSeeChar(this)) {
            LogUtils.addLog(String.format(Message.display('climbOutSuccess')
              , LogUtils.getCharName(this.mob)));
          }
          this.mob.status.groundHoleTrapped = false;
        } else {
          if (CharUtils.playerCanSeeChar(this)) {
            LogUtils.addLog(String.format(Message.display('climbOutFailed')
              , LogUtils.getCharName(this.mob)));
          }
        }
      } else {
        if (this.mob.status.afraidCount > 0) {
          this.moveAwayFromCharacter($gamePlayer);
        } else if (!CharUtils.canSee(this.mob, $gameActors.actor(1))) {
          // TODO: mob can attack when blind and try to walk into a character
          this.moveRandom();
        } else if (this.mob.status.paralyzeCount > 0 || this.mob.status.sleepCount > 0
          || this.mob.status.faintCount > 0) {
          // do nothing
        } else if (distance < 2) {
          this.turnTowardCharacter($gamePlayer);
          if (this.meleeAction($gamePlayer)) {
            this.mob.attacked = true;
          } else if (CharUtils.playerCanSeeChar(this)) {
            LogUtils.addLog(String.format(Message.display('attackOutOfEnergy'), LogUtils.getCharName(this.mob)));
          }
        } else if (distance < this.mob.awareDistance) {
          // check remote attack
          if (MapUtils.checkVisible(this, this.mob.awareDistance, $gamePlayer._x, $gamePlayer._y
            , $gameVariables[$gameMap._mapId].mapData) && this.targetInSightAction($gamePlayer)) {
            // alreay done action
          } else {
            let data = CharUtils.checkTargetReachable(this, $gamePlayer);
            if (data && this.projectileAction(data.directionX, data.directionY, data.distance)) {
              // already done action
            } else {
              // find route to player
              let path = MapUtils.findShortestRoute(this._x, this._y
                , $gamePlayer._x, $gamePlayer._y, mobTraceRouteMaxDistance);
              if (path) {
                this.moveTowardPosition(path[0].mapBlock.x, path[0].mapBlock.y);
              } else {
                this.moveTowardCharacter($gamePlayer);
              }
            }
          }
        } else {
          this.moveRandom();
        }
      }
    }
    let func = function(vm) {
      if (TimeUtils.actionDone) {
        // store data back to $dataMap
        vm.updateDataMap();
        TimeUtils.afterPlayerMoved();
      } else {
        setTimeout(func, 1, vm);
      }
    }
    func(this);
  }

  Game_Mob.prototype.performBuffIfNotPresent = function(skill) {
    if (!CharUtils.getTargetEffect(this.mob, window[skill.constructor.name])
      && SkillUtils.canPerform(this.mob, skill)) {
      skill.action(this);
      return true;
    }
    return false;
  }

  // define target in sight action (buff, range attack)
  Game_Mob.prototype.targetInSightAction = function(target) {
    return false;
  }

  // define melee action
  Game_Mob.prototype.meleeAction = function(target) {
    return BattleUtils.meleeAttack(this, target);
  }

  // define projectile action (target in line)
  Game_Mob.prototype.projectileAction = function(x, y, distance) {
    return false;
  }

  Game_Mob.prototype.moveTowardPosition = function(x, y) {
    var horz = 0, vert = 0;
    var sx = this.deltaXFrom(x);
    var sy = this.deltaYFrom(y);
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
  }

  // Override moveTowardCharacter() function so mobs can move diagonally
  Game_Mob.prototype.moveTowardCharacter = function (character) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var candidate = [], distanceRecord = [];
    var nowDistance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
    for (var i = 0; i < 8; i++) {
      var coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
      if (!MapUtils.isTilePassable($gameMap.mapId(), coordinate.x, coordinate.y
        , mapData[coordinate.x][coordinate.y].originalTile)) {
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
      this.moveTowardPosition(candidate[i].x, candidate[i].y);
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
      if (!MapUtils.isTilePassable($gameMap.mapId(), coordinate.x, coordinate.y
        , mapData[coordinate.x][coordinate.y].originalTile)) {
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
      this.moveTowardPosition(candidate[i].x, candidate[i].y);
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
      this.mob.moved = true;
    } else { // diagonal
      var horz = 4 + Math.randomInt(2) * 2;
      var vert = 2 + Math.randomInt(2) * 6;
      if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
        this.moveDiagonally(horz, vert);
        this.mob.moved = true;
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

  Game_Mob.prototype.initAttribute = function() {
    CharUtils.updateHpMp(this.mob);
  }

  // soul related
  Game_Mob.prototype.dropSoul = function(soulClass) {
    let obtained = $gameParty.hasSoul(soulClass);
    if (!obtained) {
      let soul = new soulClass();
      $gameParty._items.push(soul);
      Soul_Obtained_Action.learnSkill(soulClass);
      TimeUtils.animeQueue.push(new AnimeObject($gamePlayer, 'ANIME', 58));
      let msg = String.format(Message.display('absorbSoul'), LogUtils.getCharName(this.mob), soul.name);
      LogUtils.addLog(msg);
      setTimeout(function() {
        $gameMessage.add(msg);
      }, 200);
    }
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
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData);
    this.setImage('Monster', 0);
    if (!fromData) {
      this.mob.mobClass = 'Bat';
    }
  }

  Bat.prototype.looting = function () {
    var lootings = [];
    // TODO: implements Bat looting

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
  }

  //-----------------------------------------------------------------------------------
  // Chick

  Chick = function () {
    this.initialize.apply(this, arguments);
  }
  Chick.baseDungeonLevel = 1;

  Chick.prototype = Object.create(Game_Mob.prototype);
  Chick.prototype.constructor = Chick;

  Chick.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '小雞',
      exp: 27,
      params: [1, 1, 6, 1, 5, 1, 3, 5],
      level: 1
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Chick', 0);
    if (!fromData) {
      this.mob.mobClass = 'Chick';
    }
  }

  Chick.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Chick);
    }
  }
  CharUtils.mobTemplates.push(Chick);

  //-----------------------------------------------------------------------------------
  // Dog

  Dog = function () {
    this.initialize.apply(this, arguments);
  }
  Dog.baseDungeonLevel = 1;

  Dog.prototype = Object.create(Game_Mob.prototype);
  Dog.prototype.constructor = Dog;

  Dog.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '小狗',
      exp: 27,
      params: [1, 1, 6, 6, 10, 10, 5, 5],
      level: 1
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Nature', 0);
    if (!fromData) {
      this.mob.mobClass = 'Dog';
      this.mob._skills.push(new Skill_Bite());
      // for test only
      // this.mob._skills.push(new Skill_Shield());
    }
  }

  Dog.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Bite
      return this.mob._skills[0].action(this, target);
    // for test only
    // } else if (SkillUtils.canPerform(this.mob, this.mob._skills[1])) {
    //   return this.mob._skills[1].action(this);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Dog.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Dog_Skin());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Dog_Tooth());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Dog_Bone());
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Bite);
    }
  }
  CharUtils.mobTemplates.push(Dog);

  //-----------------------------------------------------------------------------------
  // Bee

  Bee = function () {
    this.initialize.apply(this, arguments);
  }
  Bee.baseDungeonLevel = 3;

  Bee.prototype = Object.create(Game_Mob.prototype);
  Bee.prototype.constructor = Bee;

  Bee.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '蜜蜂',
      exp: 30,
      params: [1, 1, 4, 3, 0, 0, 13, 5],
      level: 2
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Fly1', 0);
    if (!fromData) {
      this.mob.mobClass = 'Bee';
      this.mob._skills.push(new Skill_Pierce());
    }
  }

  Bee.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Pierce
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Bee.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 100, 100, 'FRESH'));
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Honey());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Bee_Sting());
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Pierce);
    }
  }
  CharUtils.mobTemplates.push(Bee);

  //-----------------------------------------------------------------------------------
  // Rooster

  Rooster = function () {
    this.initialize.apply(this, arguments);
  }
  Rooster.baseDungeonLevel = 3;

  Rooster.prototype = Object.create(Game_Mob.prototype);
  Rooster.prototype.constructor = Rooster;

  Rooster.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '大雞',
      exp: 33,
      params: [1, 1, 10, 10, 1, 5, 9, 3],
      level: 3
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Nature', 2);
    if (!fromData) {
      this.mob.mobClass = 'Rooster';
    }
  }

  Rooster.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Rooster_Tooth());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Rooster_Claw());
    }
    if (getRandomInt(100) < 50) {
      lootings.push(new Feather());
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Chick);
    }
  }
  CharUtils.mobTemplates.push(Rooster);

  //-----------------------------------------------------------------------------------
  // Rat

  Rat = function () {
    this.initialize.apply(this, arguments);
  }
  Rat.baseDungeonLevel = 4;

  Rat.prototype = Object.create(Game_Mob.prototype);
  Rat.prototype.constructor = Rat;

  Rat.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '老鼠',
      exp: 36,
      params: [1, 1, 12, 5, 0, 0, 15, 10],
      level: 4
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Mice', 1);
    if (!fromData) {
      this.mob.mobClass = 'Rat';
      this.mob._skills.push(new Skill_Hide());
    }
  }

  Rat.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40 && this.mob.status.invisibleCount == 0) { // Skill_Hide
      let skill = this.mob._skills[0];
      if (SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this);
        return true;
      }
    }
    return false;
  }

  Rat.prototype.looting = function () {
    // var lootings = [];
    // if (getRandomInt(10) < 3) {
    //   lootings.push(new Chicken_Meat());
    // }
    // if (getRandomInt(100) < 25) {
    //   lootings.push(new Rooster_Tooth());
    // }
    // if (getRandomInt(100) < 25) {
    //   lootings.push(new Rooster_Claw());
    // }
    // if (getRandomInt(100) < 50) {
    //   lootings.push(new Feather());
    // }

    // for (var id in lootings) {
    //   ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    // }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_EatRot);
    }
  }
  CharUtils.mobTemplates.push(Rat);

  //-----------------------------------------------------------------------------------
  // Cat

  Cat = function () {
    this.initialize.apply(this, arguments);
  }
  Cat.baseDungeonLevel = 4;

  Cat.prototype = Object.create(Game_Mob.prototype);
  Cat.prototype.constructor = Cat;

  Cat.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '貓',
      exp: 36,
      params: [1, 1, 6, 6, 30, 20, 15, 5],
      level: 4
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Nature', 1);
    if (!fromData) {
      this.mob.mobClass = 'Cat';
      this.mob._skills.push(new Skill_Clever());
      this.mob._skills.push(new Skill_DarkFire());
    }
  }

  Cat.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Clever
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Cat.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_DarkFire
      let skill = this.mob._skills[1];
      if (distance <= window[skill.constructor.name].prop.effect[skill.lv - 1].distance
        && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Cat.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Cat_Tooth());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Cat_Claw());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Cat_Skin());
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Clever);
    }
  }
  CharUtils.mobTemplates.push(Cat);

  //-----------------------------------------------------------------------------------
  // Boar

  Boar = function () {
    this.initialize.apply(this, arguments);
  }
  Boar.baseDungeonLevel = 5;

  Boar.prototype = Object.create(Game_Mob.prototype);
  Boar.prototype.constructor = Boar;

  Boar.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '野豬',
      exp: 43,
      params: [1, 1, 12, 15, 0, 0, 8, 5],
      level: 5
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Boar', 1);
    if (!fromData) {
      this.mob.mobClass = 'Boar';
      this.mob._skills.push(new Skill_Charge());
    }
  }

  Boar.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80 && distance < 3) { // Skill_Charge
      let skill = this.mob._skills[0];
      if (SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Boar.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Boar_Tooth());
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Charge);
    }
  }
  CharUtils.mobTemplates.push(Boar);

  //-----------------------------------------------------------------------------------
  // Wolf

  Wolf = function () {
    this.initialize.apply(this, arguments);
  }
  Wolf.baseDungeonLevel = 5;

  Wolf.prototype = Object.create(Game_Mob.prototype);
  Wolf.prototype.constructor = Wolf;

  Wolf.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '狼',
      exp: 50,
      params: [1, 1, 14, 10, 10, 10, 10, 3],
      level: 6
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Animal', 2);
    if (!fromData) {
      this.mob.mobClass = 'Wolf';
      this.mob._skills.push(new Skill_Scud());
      let toPush = new Skill_Bite();
      toPush.lv = 2;
      this.mob._skills.push(toPush);
    }
  }

  Wolf.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Scud
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Wolf.prototype.meleeAction = function(target) {
    let randNum = getRandomInt(100);
    if (randNum < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_Bite
      return this.mob._skills[1].action(this, target);
    } else if (randNum < 50 && this.performBuffIfNotPresent(this.mob._skills[0])) {
      return true;
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Wolf.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 25) {
      lootings.push(new Wolf_Tooth());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Wolf_Skin());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Wolf_Claw());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Wolf_Bone());
    }
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Scud);
    }
  }
  CharUtils.mobTemplates.push(Wolf);

  //-----------------------------------------------------------------------------------
  // Turtle

  Turtle = function () {
    this.initialize.apply(this, arguments);
  }
  Turtle.baseDungeonLevel = 5;

  Turtle.prototype = Object.create(Game_Mob.prototype);
  Turtle.prototype.constructor = Turtle;

  Turtle.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '烏龜',
      exp: 50,
      params: [1, 1, 10, 30, 30, 30, 5, 10],
      xparams: [3, 3, 0],
      level: 6
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Animal', 6);
    if (!fromData) {
      this.mob.mobClass = 'Turtle';
      this.mob._skills.push(new Skill_Shield());
    }
  }

  Turtle.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Shield
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Turtle.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && this.performBuffIfNotPresent(this.mob._skills[0])) { // Skill_Shield
      return true;
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Turtle.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 25) {
      lootings.push(new Turtle_Shell());
    }
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Shield);
    }
  }
  CharUtils.mobTemplates.push(Turtle);

  //-----------------------------------------------------------------------------------
  // Bear

  Bear = function () {
    this.initialize.apply(this, arguments);
  }
  Bear.baseDungeonLevel = 5;

  Bear.prototype = Object.create(Game_Mob.prototype);
  Bear.prototype.constructor = Bear;

  Bear.prototype.initialize = function (x, y, fromData) {
    let mobInitData = {
      name: '熊',
      exp: 50,
      params: [1, 1, 10, 30, 30, 30, 5, 10],
      level: 6
    }
    Game_Mob.prototype.initialize.call(this, x, y, 11, fromData, mobInitData);
    this.setImage('Bear', 0);
    if (!fromData) {
      this.mob.mobClass = 'Bear';
      this.mob._skills.push(new Skill_Bash());
    }
  }

  Bear.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Bite
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Bear.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 25) {
      lootings.push(new Bear_Skin());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Bear_Claw());
    }
    if (getRandomInt(100) < 25) {
      lootings.push(new Bear_Bone());
    }
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }

    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }
    if (getRandomInt(100) < 10) {
      this.dropSoul(Soul_Bash);
    }
  }
  CharUtils.mobTemplates.push(Bear);

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
        MapUtils.updateMessage(Message.display('noDoor'));
      }
      return false;
    }
    if (door.status == 2) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage(Message.display('doorOpened'));
      }
      return false;
    } else if (door.status == 0) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage(Message.display('doorLocked'));
      }
      return false;
    }
    // open the door successfully
    door.status = 2;
    if (character == $gamePlayer && $gameActors.actor(1).status.blindCount > 0) {
      MapUtils.drawDoorWhenBlind(x, y);
    }
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], true);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    LogUtils.addLog(Message.display('openDoor'));
    AudioManager.playSe({name: 'Open1', pan: 0, pitch: 100, volume: 100});
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
        MapUtils.updateMessage(Message.display('noDoor'));
      }
      return false;
    }
    if (door.status != 2) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage(Message.display('doorClosed'));
      }
      return false;
    }
    // check if there's object blocked the doorway
    if (events.length > 1 || $gamePlayer.pos(x, y) || ItemUtils.findMapItemPileEvent(x, y)) {
      if (character == $gamePlayer) {
        MapUtils.updateMessage(Message.display('doorStucked'));
      }
      return false;
    }
    // close the door successfully
    door.status = 1;
    if (character == $gamePlayer && $gameActors.actor(1).status.blindCount > 0) {
      MapUtils.drawDoorWhenBlind(x, y);
    }
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], false);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    LogUtils.addLog(Message.display('closeDoor'));
    AudioManager.playSe({name: 'Close1', pan: 0, pitch: 100, volume: 100});
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
    if (src._x == x && src._y == y) {
      // target self
      this.moveFunc = function() {};
    } else if (src._x == x) {
      if (y - 1 == src._y) {
        this.param1 = 2;
      } else {
        this.param1 = 8;
      }
    } else if (src._y == y) {
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
      if ($gamePlayer.pos(this._x, this._y)) {
        vanish = this.hitCharacter(this, $gamePlayer);
      } else {
        let events = $gameMap.eventsXy(this._x, this._y);
        for (let id in events) {
          let evt = events[id];
          if (evt.type == 'DOOR' && evt.status != 2) { // hit closed door
            vanish = this.hitDoor(this);
          } else if ($gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(this._x, this._y)]
            && !$gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(this._x, this._y)].isRevealed) {
            // secret door not revealed yet
            vanish = this.hitDoor(this);
          } else if (evt.type == 'MOB') { // hit character
            vanish = this.hitCharacter(this, evt);
          }
        }
      }
      // hit wall
      if (!vanish && $gameVariables[$gameMap._mapId].mapData[this._x][this._y].originalTile == WALL) {
        vanish = this.hitWall(this);
      }
    }
    if (!vanish) {
      TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distance));
    }
    // set event to original place, so anime can start from the correct position
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
    // setup tp cost
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseTp(realSrc, throwItemTpCost);
    realSrc.attacked = true;
  };

  Projectile_Potion.prototype.createProjectile = function(src, x, y) {
    let projectile = new Projectile_Potion(src, x, y);
    if ($gameVariables[$gameMap._mapId].mapData[src._x][src._y].isVisible) {
      let realSrc = BattleUtils.getRealTarget(src);
      LogUtils.addLog(String.format(Message.display('throwItem'), LogUtils.getCharName(realSrc)
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
        , LogUtils.getCharName(realTarget)));
    }
    $gameVariables[0].fireProjectileInfo.item.onQuaff(evt, true);
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
    CharUtils.decreaseHp(realTarget, value);
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    TimeUtils.animeQueue.push(new AnimeObject(evt, 'ANIME', 67));
    TimeUtils.animeQueue.push(new AnimeObject(evt, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
      ,vm.skillName, LogUtils.getCharName(realTarget), value));
    BattleUtils.checkTargetAlive(realSrc, realTarget, evt);
    vm.distanceCount = 99;
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Projectile_SingleTarget
  //
  // projectile that hits single enemy, then vanish

  Projectile_SingleTarget = function () {
    this.initialize.apply(this, arguments);
  }

  Projectile_SingleTarget.prototype = Object.create(Game_Projectile.prototype);
  Projectile_SingleTarget.prototype.constructor = Projectile_SingleTarget;

  Projectile_SingleTarget.prototype.initialize = function (src, x, y, projectileData) {
    Game_Projectile.prototype.initialize.call(this, src, x, y);
    this.setImage(projectileData.imageName, projectileData.imageIndex);
    this.distance = projectileData.distance;
    this.projectileData = projectileData;
    this.action();
    $gameVariables[0].messageFlag = false;
  };

  Projectile_SingleTarget.prototype.hitCharacter = function(vm, evt) {
    Game_Projectile.prototype.hitCharacter.call(this, vm, evt);
    if (this.projectileData.hitCharFunc) {
      this.projectileData.hitCharFunc(vm, evt);
    }
    return true;
  }

  Projectile_SingleTarget.prototype.hitDoor = function(vm, evt) {
    Game_Projectile.prototype.hitDoor.call(this, vm, evt);
    if (this.projectileData.hitDoorFunc) {
      this.projectileData.hitDoorFunc(vm, evt);
    }
    return true;
  }

  Projectile_SingleTarget.prototype.hitWall = function(vm, evt) {
    Game_Projectile.prototype.hitWall.call(this, vm, evt);
    if (this.projectileData.hitWallFunc) {
      this.projectileData.hitWallFunc(vm, evt);
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Projectile_Item

  Projectile_Item = function () {
    this.initialize.apply(this, arguments);
  }

  Projectile_Item.prototype = Object.create(Game_Projectile.prototype);
  Projectile_Item.prototype.constructor = Projectile_Item;

  Projectile_Item.prototype.initialize = function (src, x, y) {
    Game_Projectile.prototype.initialize.call(this, src, x, y);
    // setup images
    let imageData = ItemUtils.getImageData($gameVariables[0].fireProjectileInfo.item);
    this._originalPattern = imageData.pattern;
    this.setPattern(imageData.pattern);
    this._direction = imageData.direction;
    this.setImage(imageData.image, imageData.imageIndex);
    this.distance = 5;
    // setup tp cost
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseTp(realSrc, throwItemTpCost);
    realSrc.attacked = true;
  };

  Projectile_Item.prototype.createProjectile = function(src, x, y) {
    let projectile = new Projectile_Item(src, x, y);
    if ($gameVariables[$gameMap._mapId].mapData[src._x][src._y].isVisible) {
      let realSrc = BattleUtils.getRealTarget(src);
      LogUtils.addLog(String.format(Message.display('throwItem'), LogUtils.getCharName(realSrc)
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

  // calculate last position before hit door/wall
  Projectile_Item.prototype.calcLastPosition = function(vm) {
    let lastX = vm._x, lastY = vm._y;
    if (!vm.param2) {
      switch (vm.param1) {
        case 2:
          lastY--;
          break;
        case 8:
          lastY++;
          break;
        case 6:
          lastX--;
          break;
        case 4:
          lastX++;
          break;
      }
    } else {
      lastX = (vm.param1 == 4) ? lastX + 1 : lastX - 1;
      lastY = (vm.param2 == 8) ? lastY + 1 : lastY - 1;
    }
    return {x: lastX, y: lastY};
  }

  Projectile_Item.prototype.hitCharacter = function(vm, evt) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    vm.distanceCount = 99;
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Slash3"));
    BattleUtils.projectileAttack(vm.src, evt, $gameVariables[0].fireProjectileInfo.item);
    ItemUtils.addItemToItemPile(evt._x, evt._y, $gameVariables[0].fireProjectileInfo.item);
    return true;
  }

  Projectile_Item.prototype.hitDoor = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(this, 'PROJECTILE', this.distanceCount));
    let lastPos = this.calcLastPosition(vm);
    vm.distanceCount = 99;
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Sword1"));
    if ($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y].isVisible) {
      LogUtils.addLog(String.format(Message.display('throwItemHitObstacle')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
    ItemUtils.addItemToItemPile(lastPos.x, lastPos.y, $gameVariables[0].fireProjectileInfo.item);
    return true;
  }

  Projectile_Item.prototype.hitWall = function(vm) {
    return this.hitDoor(vm);
  }

  Projectile_Item.prototype.action = function () {
    let vanish = Game_Projectile.prototype.action.call(this);
    if (!vanish) {
      let direction = this.calcLastPosition(this);
      let newX = this._x - (direction.x - this._x) * this.distance;
      let newY = this._y - (direction.y - this._y) * this.distance;
      ItemUtils.addItemToItemPile(newX, newY, $gameVariables[0].fireProjectileInfo.item);
    }
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
  // TrapUtils
  //
  // Utility for Traps

  TrapUtils = function() {
    throw new Error('This is a static class');
  }

  TrapUtils.trapTemplates = [];

  TrapUtils.generateTraps = function(mapId, floors) {
    // generate upsatir/downstair
    for (let id in $gameVariables[mapId].stairList) {
      let stairData = $gameVariables[mapId].stairList[id];
      if (1 == stairData.type) {
        new DownStair(stairData.x, stairData.y);
      } else {
        new UpStair(stairData.x, stairData.y);
      }
    }
    // TODO: implement trap generating mechanism
    let trapCounts = Math.round(floors.length * trapSpawnPercentage);
    for (let i = 0; i < trapCounts; i++) {
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob(mapId, floor.x, floor.y)
          && TrapUtils.canPlaceTrap(mapId, floor.x, floor.y)) {
          let trapType = TrapUtils.trapTemplates[Math.randomInt(TrapUtils.trapTemplates.length)];
          new trapType(floor.x, floor.y);
          break;
        }
      }
    }
    // for test play only
    if (mapId == dungeonDepth) {
      while (true) {
        let floor = floors[Math.randomInt(floors.length)];
        if (MapUtils.isTileAvailableForMob(mapId, floor.x, floor.y)
          && TrapUtils.canPlaceTrap(mapId, floor.x, floor.y)) {
          new Trap_GoHome(floor.x, floor.y);
          break;
        }
      }
    }
  }

  TrapUtils.checkTrapStepped = function(target) {
    let evts = $gameMap.eventsXy(target._x, target._y);
    for (let id in evts) {
      let evt = evts[id];
      if (evt.type == 'TRAP' && evt.trap.lastTriggered != target) {
        if (CharUtils.playerCanSeeChar(target)) {
          evt.trap.isRevealed = true;
        }
        evt.triggered(target);
        break;
      }
    }
  }

  TrapUtils.updateLastTriggered = function() {
    let mapEvts = $gameMap.events();
    for (let id in mapEvts) {
      let mapEvt = mapEvts[id];
      if (mapEvt.type == 'TRAP') {
        let target = null;
        if ($gamePlayer.pos(mapEvt._x, mapEvt._y)) {
          target = $gamePlayer;
        } else {
          let evts = $gameMap.eventsXy(mapEvt._x, mapEvt._y);
          for (let id in evts) {
            let evt = evts[id];
            if (evt.type == 'MOB') {
              target = evt;
              break;
            }
          }
        }
        mapEvt.trap.lastTriggered = target;
      }
    }
  }

  TrapUtils.drawTrap = function(event) {
    if (event.trap.isRevealed && $gameVariables[$gameMap._mapId].mapData[event._x][event._y].isExplored) {
      let imageData = event.trap.imageData;
      let opacity;
      if ($gameVariables[$gameMap._mapId].mapData[event._x][event._y].isVisible) {
        opacity = 255;
      } else {
        opacity = 128;
      }
      MapUtils.drawImage(event, imageData, opacity);
    }
    event.updateDataMap();
  }

  TrapUtils.canPlaceTrap = function(mapId, x, y) {
    if ((!MapUtils.isTilePassable(mapId, x - 1, y, $gameVariables[mapId].mapData[x - 1][y].originalTile)
      && !MapUtils.isTilePassable(mapId, x + 1, y, $gameVariables[mapId].mapData[x + 1][y].originalTile))
      || (!MapUtils.isTilePassable(mapId, x, y - 1, $gameVariables[mapId].mapData[x][y - 1].originalTile)
      && !MapUtils.isTilePassable(mapId, x, y + 1, $gameVariables[mapId].mapData[x][y + 1].originalTile))) {
      return false;
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Game_Trap
  //
  // The game object class for a trap on map, inherit from Game_Event
  Game_Trap = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Trap.prototype = Object.create(Game_Event.prototype);
  Game_Trap.prototype.constructor = Game_Trap;

  Game_Trap.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.trap = src.trap;
  }

  Game_Trap.prototype.initStatus = function (event) {
    event.type = 'TRAP';
    event.trap = {};
    event.trap.lastTriggered = null;
    event.trap.isRevealed = false;
  }

  Game_Trap.prototype.updateDataMap = function () {
    Game_Trap.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_Trap.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_Trap.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // add new event at the bottom of list
      eventId = $dataMap.events.length;
      $dataMap.events.push(newDataMapEvent($gameVariables[0].templateEvents.trap, eventId, x, y));
      Game_Trap.prototype.initStatus($dataMap.events[$dataMap.events.length - 1]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameVariables[0].transferInfo.toMapId].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameVariables[0].transferInfo.toMapId, eventId);
    $gameMap._events[eventId] = this;
  };

  Game_Trap.prototype.triggered = function(target) {
    // implement by each traps
  }

  //-----------------------------------------------------------------------------------
  // Trap_Spike
  //
  // class for spike trap

  Trap_Spike = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_Spike.prototype = Object.create(Game_Trap.prototype);
  Trap_Spike.prototype.constructor = Trap_Spike;

  Trap_Spike.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_Spike';
    this.trap.imageData = new ImageData('!Other1', 4, 1, 8);
    this.trap.name = '尖刺陷阱';
  }

  Trap_Spike.prototype.triggered = function(target) {
    let damage = dice(2, 6);
    let realTarget = BattleUtils.getRealTarget(target);
    CharUtils.decreaseHp(realTarget, damage);
    if (CharUtils.playerCanSeeChar(target)) {
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 11));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
      LogUtils.addLog(String.format(Message.display('spikeTrapTriggered')
        , LogUtils.getCharName(realTarget), damage));
    }
    BattleUtils.checkTargetAlive(null, realTarget, target);
  }

  //-----------------------------------------------------------------------------------
  // Trap_Teleport
  //
  // class for teleport trap

  Trap_Teleport = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_Teleport.prototype = Object.create(Game_Trap.prototype);
  Trap_Teleport.prototype.constructor = Trap_Teleport;

  Trap_Teleport.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_Teleport';
    this.trap.imageData = new ImageData('Collections3', 5, 2, 8);
    this.trap.name = '傳送陷阱';
  }

  Trap_Teleport.prototype.triggered = function(target) {
    // TODO: check if target able to teleport
    let scroll = new Scroll_Teleport();
    let realTarget = BattleUtils.getRealTarget(target);
    if (CharUtils.playerCanSeeChar(target)) {
      LogUtils.addLog(String.format(Message.display('teleportTrapTriggered'), LogUtils.getCharName(realTarget)));
    }
    scroll.onRead(target);
  }

  //-----------------------------------------------------------------------------------
  // Trap_GroundHole
  //
  // class for ground hole trap

  Trap_GroundHole = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_GroundHole.prototype = Object.create(Game_Trap.prototype);
  Trap_GroundHole.prototype.constructor = Trap_GroundHole;

  Trap_GroundHole.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_GroundHole';
    this.trap.imageData = new ImageData('Outside_B1', 4, 1, 4);
    this.trap.name = '地洞陷阱';
  }

  Trap_GroundHole.prototype.triggered = function(target) {
    let damage = dice(1, 5);
    let realTarget = BattleUtils.getRealTarget(target);
    CharUtils.decreaseHp(realTarget, damage);
    realTarget.status.groundHoleTrapped = true;
    if (CharUtils.playerCanSeeChar(target)) {
      AudioManager.playSe({name: 'Damage3', pan: 0, pitch: 100, volume: 100});
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
      LogUtils.addLog(String.format(Message.display('groundHoleTrapTriggered')
        , LogUtils.getCharName(realTarget), damage));
    }
  }

  //-----------------------------------------------------------------------------------
  // Trap_MagicEffect
  //
  // class for magic effect trap, can give various effects by several turns

  Trap_MagicEffect = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_MagicEffect.prototype = Object.create(Game_Trap.prototype);
  Trap_MagicEffect.prototype.constructor = Trap_MagicEffect;

  Trap_MagicEffect.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_MagicEffect';
    this.trap.imageData = new ImageData('!Door2', 4, 0, 6);
    this.trap.name = '魔法陷阱';
  }

  Trap_MagicEffect.prototype.triggered = function(target) {
    if (CharUtils.playerCanSeeChar(target)) {
      let realTarget = BattleUtils.getRealTarget(target);
      LogUtils.addLog(String.format(Message.display('magicTrapTriggered')
        , LogUtils.getCharName(realTarget)));
    }
    let effectPotion = new ItemUtils.potionTemplates[getRandomInt(5)]();
    effectPotion.onQuaff(target);
  }

  // put all trap templates into list
  TrapUtils.trapTemplates[0] = Trap_Spike;
  TrapUtils.trapTemplates[1] = Trap_Teleport;
  TrapUtils.trapTemplates[2] = Trap_GroundHole;
  TrapUtils.trapTemplates[3] = Trap_MagicEffect;

  //-----------------------------------------------------------------------------------
  // UpStair
  //
  // class for up stair, borrow prototype from Game_Trap

  UpStair = function () {
    this.initialize.apply(this, arguments);
  }

  UpStair.prototype = Object.create(Game_Trap.prototype);
  UpStair.prototype.constructor = UpStair;

  UpStair.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'UpStair';
    this.trap.imageData = new ImageData('Stair', 3, 2, 6);
    this.trap.name = '往上的樓梯';
    this.trap.isRevealed = true;
  }

  UpStair.prototype.triggered = function(target) {
    // nothing
  }

  //-----------------------------------------------------------------------------------
  // DownStair
  //
  // class for down stair, borrow prototype from Game_Trap

  DownStair = function () {
    this.initialize.apply(this, arguments);
  }

  DownStair.prototype = Object.create(Game_Trap.prototype);
  DownStair.prototype.constructor = DownStair;

  DownStair.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'DownStair';
    this.trap.imageData = new ImageData('Stair', 3, 2, 8);
    this.trap.name = '往下的樓梯';
    this.trap.isRevealed = true;
  }

  DownStair.prototype.triggered = function(target) {
    // nothing
  }

  //-----------------------------------------------------------------------------------
  // Trap_GoHome
  //
  // class for test event: Howard go home

  Trap_GoHome = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_GoHome.prototype = Object.create(Game_Trap.prototype);
  Trap_GoHome.prototype.constructor = Trap_GoHome;

  Trap_GoHome.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_GoHome';
    this.trap.imageData = new ImageData('!Door2', 0, 1, 8);
    this.trap.name = '傳送門';
    this.trap.isRevealed = true;
  }

  Trap_GoHome.prototype.triggered = function(target) {
    if (target == $gamePlayer) {
      eventId = $dataMap.events.length;
      $dataMap.events.push(newDataMapEvent($gameVariables[0].templateEvents.goHome, eventId, 0, 0));
      let evt = new Game_Event($gameMap.mapId(), eventId);
      $gameMap._events[eventId] = evt;
      evt.start();
    }
  }

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

  Input.getNextCoordinate = function(src, code) {
    let x = src._x, y = src._y;
    switch (code) {
      case 'Numpad8': case 'ArrowUp': case '8':
        y--;
        break;
      case 'Numpad2': case 'ArrowDown': case '2':
        y++;
        break;
      case 'Numpad4': case 'ArrowLeft': case '4':
        x--;
        break;
      case 'Numpad6': case 'ArrowRight': case '6':
        x++;
        break;
      case 'Numpad1': case 'End': case '1':
        x--;
        y++;
        break;
      case 'Numpad3': case 'PageDown': case '3':
        x++;
        y++;
        break;
      case 'Numpad7': case 'Home': case '7':
        x--;
        y--;
        break;
      case 'Numpad9': case 'PageUp': case '9':
        x++;
        y--;
        break;
      case 'Numpad5':
        // same coordinate
        break;
      case 'Escape': case 'Numpad0': case 'Insert': case '0':
        x = -1, y = -1;
        // remove message window
        $gameVariables[0].messageFlag = false;
        SceneManager._scene.removeChild(messageWindow);
        SceneManager._scene.removeChild(logWindow);
        break;
      default:
        MapUtils.updateMessage(Message.display('notDirection'));
        x = -1, y = -1;
        break;
    }
    return new Coordinate(x, y);
  }

  // override this function for user-defined key detected
  Input._onKeyDown = function (event) {
    // setup hotkeys (on skill scenes)
    if (SceneManager._scene instanceof Scene_WarSkill && SceneManager.isCurrentSceneStarted()) {
      let prefix = 'Digit';
      for (let i = 0; i < 10; i++) {
        if (prefix + i == event.code) {
          let skill = SceneManager._scene.item();
          if ($gameVariables[0].hotkeys[i] == skill) {
            $gameVariables[0].hotkeys[i] = null;
          } else {
            let oldHotkey = SkillUtils.getHotKey(skill);
            if (oldHotkey != null) {
              $gameVariables[0].hotkeys[oldHotkey] = null;
            }
            $gameVariables[0].hotkeys[i] = skill;
          }
          SceneManager._scene._itemWindow.refresh();
          break;
        }
      }
    }
    // normal moves (on Scene_Map)
    if (SceneManager._scene instanceof Scene_Map && !$gameMessage.isBusy() && $gamePlayer.canMove()
      && SceneManager.isCurrentSceneStarted()) {
      let player = $gameActors.actor(1);
      if ($gameVariables[0].directionalFlag) {
        // choose direction mode
        let coordinate = Input.getNextCoordinate($gamePlayer, event.code);
        let x = coordinate.x, y = coordinate.y;
        if (!(x == -1 && y == -1)) {
          $gameActors.actor(1).moved = $gameVariables[0].directionalAction($gamePlayer, x, y);
        }
        // check if player moved
        if ($gameActors.actor(1).moved) {
          // use async strategy, because $gameSelfSwitches needs time to update to event
          setTimeout('TimeUtils.afterPlayerMoved();', 100);
          $gameVariables[0].messageFlag = false;
          SceneManager._scene.removeChild(messageWindow);
          SceneManager._scene.removeChild(logWindow);
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
      // classify by code
      switch (event.code) {
        case 'Numpad8': case 'ArrowUp':
          $gamePlayer.moveStraight(8);
          break;
        case 'Numpad2': case 'ArrowDown':
          $gamePlayer.moveStraight(2);
          break;
        case 'Numpad4': case 'ArrowLeft':
          $gamePlayer.moveStraight(4);
          break;
        case 'Numpad6': case 'ArrowRight':
          $gamePlayer.moveStraight(6);
          break;
        case 'Numpad7': case 'Home':
          $gamePlayer.moveDiagonally(4, 8);
          break;
        case 'Numpad9': case 'PageUp':
          $gamePlayer.moveDiagonally(6, 8);
          break;
        case 'Numpad1': case 'End':
          $gamePlayer.moveDiagonally(4, 2);
          break;
        case 'Numpad3': case 'PageDown':
          $gamePlayer.moveDiagonally(6, 2);
          break;
        case 'Numpad5': case 'Period': // wait action
          TimeUtils.afterPlayerMoved();
          break;
      }
      // check hotkeys
      let prefix = 'Digit';
      for (let i = 0; i < 10; i++) {
        if (event.code == prefix + i) {
          if ($gameVariables[0].hotkeys[i]) {
            SkillUtils.performSkill($gameVariables[0].hotkeys[i]);
          } else {
            MapUtils.displayMessage(Message.display('hotkeyUndefined'));
          }
          break;
        }
      }
      // classify by key
      switch (event.key) {
        case 'Enter': // quick action
          // check stairs
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if ($gamePlayer.pos(candidate.x, candidate.y)) {
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
            $gameActors.actor(1).moved = true;
          }
          break;
        case '>': // go down
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if ($gamePlayer.pos(candidate.x, candidate.y) && candidate.type == 1) {
              stair = candidate;
              break;
            }
          }
          if (stair) {
            MapUtils.transferCharacter($gamePlayer);
            LogUtils.addLog(Message.display('goDownstair'));
            $gameActors.actor(1).moved = true;
          } else {
            MapUtils.displayMessage(Message.display('noStairDown'));
          }
          break;
        case '<': // go up
          var stair = null;
          for (var i in $gameVariables[$gameMap.mapId()].stairList) {
            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
            if ($gamePlayer.pos(candidate.x, candidate.y) && candidate.type == 0) {
              stair = candidate;
              break;
            }
          }
          if (stair) {
            MapUtils.transferCharacter($gamePlayer);
            LogUtils.addLog(Message.display('goUpstair'));
            $gameActors.actor(1).moved = true;
          } else {
            MapUtils.displayMessage(Message.display('noStairUp'));
          }
          break;
        case 'g': // pick things up from the ground
          let itemPile = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y);
          if (itemPile) {
            if (itemPile.itemPile.objectStack.length == 1) {
              let obj = itemPile.itemPile.objectStack[0];
              ItemUtils.removeItemFromItemPile($gamePlayer._x, $gamePlayer._y, obj);
              $gameParty.gainItem(obj, 1);
              LogUtils.addLog(String.format(Message.display('getItems'), ItemUtils.getItemDisplayName(obj)));
              TimeUtils.afterPlayerMoved();
            } else {
              SceneManager.push(Scene_GetItem);
            }
          } else {
            MapUtils.displayMessage(Message.display('noItemGround'));
          }
          break;
        case 'd': // drop things from player inventory
          let items = $gameParty.allItemsExceptSouls();
          if (items.length == 0) {
            MapUtils.displayMessage(Message.display('noItemInventory'));
          } else if (items.length == 1) {
            let obj = items[0];
            $gameParty.loseItem(obj, 1);
            // setup item to itemPile on the ground
            ItemUtils.addItemToItemPile($gamePlayer._x, $gamePlayer._y, obj);
            LogUtils.addLog(String.format(Message.display('dropItems'), ItemUtils.getItemDisplayName(obj)));
            TimeUtils.afterPlayerMoved();
          } else {
            SceneManager.push(Scene_DropItem);
          }
          break;
        case 'o': // open a door
          $gameVariables[0].directionalAction = Game_Door.prototype.openDoor;
          $gameVariables[0].directionalFlag = true;
          MapUtils.displayMessage(Message.display('askDirection'));
          break;
        case 'c': // close a door
          $gameVariables[0].directionalAction = Game_Door.prototype.closeDoor;
          $gameVariables[0].directionalFlag = true;
          MapUtils.displayMessage(Message.display('askDirection'));
          break;
        case 'i': // open inventory
          if ($gameParty.allItemsExceptSouls().length == 0) {
            MapUtils.displayMessage(Message.display('noItemInventory'));
          } else {
            SceneManager.push(Scene_Item);
          }
          break;
        case 'w': // open equipment window
          SceneManager.push(Scene_Equip);
          break;
        case 'e': // eat food
          SceneManager.push(Scene_EatFood);
          break;
        case '/': // display log
          LogUtils.displayLogWindow();
          break;
        case 'f': // fire projectile
          if ($gameActors.actor(1)._tp < throwItemTpCost) {
            MapUtils.displayMessage(Message.display('noEnergy'));
          } else if ($gameVariables[0].defaultProjectile) {
            let item;
            let allItems = $gameParty.allItemsExceptSouls();
            for (let id in allItems) {
              if (allItems[id].name == $gameVariables[0].defaultProjectile.name) {
                item = allItems[id];
                break;
              }
            }
            if (item) {
              $gameVariables[0].fireProjectileInfo.item = item;
              Scene_FireProjectile.prototype.askProjectileDirection();
            } else {
              MapUtils.displayMessage('你身上並沒有' + $gameVariables[0].defaultProjectile.name + '.');
            }
          } else  {
            SceneManager.push(Scene_FireProjectile);
          }
          break;
        case 'q': // quaff potion
          SceneManager.push(Scene_QuaffPotion);
          break;
        case 'r': // read scroll
          SceneManager.push(Scene_ReadScroll);
          break;
        case 's': // search environment
          for (let i = 0; i < 8; i++) {
            let coordinate = MapUtils.getNearbyCoordinate($gamePlayer._x, $gamePlayer._y, i);
            // search for secret door
            if ($gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(coordinate.x, coordinate.y)]
              && !$gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(coordinate.x, coordinate.y)].isRevealed) {
              // TODO: implement search success probability
              if (Math.random() < 0.2) {
                $gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(coordinate.x, coordinate.y)].isRevealed = true;
                if ($gameVariables[$gameMap._mapId].mapData[coordinate.x][coordinate.y].originalTile == DOOR) {
                  $gameVariables[$gameMap._mapId].mapData[coordinate.x][coordinate.y].base = floorCenter;
                  new Game_Door(coordinate.x, coordinate.y);
                  LogUtils.addLog(Message.display('secretDoorDiscovered'));
                }
              }
            }
            // search for traps
            let evts = $gameMap.eventsXy(coordinate.x, coordinate.y);
            for (let id in evts) {
              let evt = evts[id];
              if (evt.type == 'TRAP' && !evt.trap.isRevealed && Math.random() < 0.2) {
                evt.trap.isRevealed = true;
                LogUtils.addLog(String.format(Message.display('secretTrapDiscovered'), evt.trap.name));
              }
            }
          }
          TimeUtils.afterPlayerMoved();
          break;
        case 'W': // war skill
          SceneManager.push(Scene_WarSkill);
          break;
        case 'C': // cast magic
          SceneManager.push(Scene_CastMagic);
          break;
        case 'S': // call save/load menu
          SceneManager.push(Scene_Save);
          break;
        case 'M': // call crafting screen (mix)
          SceneManager.push(Scene_Craft);
          break;
        case 'Q': // setup default projectile
          SceneManager.push(Scene_SetupProjectile);
          break;
        case 'h': case '?': // help page
          LogUtils.displayHelpWindow();
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
  TimeUtils.animeState = 0;
  TimeUtils.animeQueue = [];
  TimeUtils.isAnimePlaying = false;
  TimeUtils.actionDone = true;

  // this implementation waits for anime done, keeps whole animation played, but much more delayed
  // TimeUtils.playAnime = function() {
  //   switch (TimeUtils.animeState) {
  //     case 0:
  //       TimeUtils.isAnimePlaying = true;
  //       if (!$gameVariables[0].projectileMoving) {
  //         if (TimeUtils.animeIndicator < TimeUtils.animeQueue.length) {
  //           let anime = TimeUtils.animeQueue[TimeUtils.animeIndicator];
  //           switch (anime.type) {
  //             case 'ANIME':
  //               anime.target.requestAnimation(anime.value);
  //               break;
  //             case 'POP_UP':
  //               let str;
  //               if (anime.value > 0) {
  //                 str = "\\c[24]  +";
  //               } else {
  //                 str = "\\c[18]  ";
  //               }
  //               $gameSystem.createPopup(0, "", str + anime.value, anime.target);
  //               break;
  //             case 'PROJECTILE':
  //               $gameVariables[0].projectileMoving = true;
  //               anime.target.distance = anime.value;
  //               anime.target.distanceCount = 0;
  //               let f = function(target) {
  //                 target.moveFunc(target.param1, target.param2);
  //                 target.distanceCount++;
  //                 if (target.distanceCount > target.distance) {
  //                   $gameVariables[0].projectileMoving = false;
  //                   target.setPosition(-10, -10);
  //                   $gameMap._events[target._eventId] = null;
  //                   $dataMap.events[target._eventId] = null;
  //                   return;
  //                 }
  //                 setTimeout(f, 50, target);
  //               }
  //               f(anime.target);
  //               break;
  //             case 'SE':
  //               AudioManager.playSe({name: anime.value, pan: 0, pitch: 100, volume: 100});
  //               break;
  //             default:
  //               console.log('ERROR: no such type: ' + anime.type);
  //               break;
  //           }
  //           TimeUtils.animeIndicator++;
  //         } else {
  //           TimeUtils.animeState = 1;
  //         }
  //       }
  //       return TimeUtils.playAnime();
  //     case 1:
  //       let isAnimePlaying = false;
  //       for (let i = 0; i < TimeUtils.animeQueue.length; i++) {
  //         let target = TimeUtils.animeQueue[i].target;
  //         if (target) {
  //           isAnimePlaying = target.isAnimationPlaying();
  //         }
  //       }
  //       if (isAnimePlaying) {
  //         setTimeout(TimeUtils.playAnime, 0);
  //         return;
  //       } else {
  //         console.log('animation done!');
  //         TimeUtils.isAnimePlaying = false;
  //       }
  //       TimeUtils.animeState = 0;
  //       TimeUtils.animeIndicator = 0;
  //       TimeUtils.animeQueue.length = 0;
  //       return;
  //   }
  // }

  TimeUtils.playAnime = function() {
    let func = TimeUtils.playAnime, waiting = 1;
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

  TimeUtils.afterPlayerMovedData = {
    state: 0,
    mobIndex: 0,
    timeSpent: 0,
    tempTimeSpent: 0,
    done: false
  }

  TimeUtils.afterPlayerMoved = function (timeSpent) {
    switch (TimeUtils.afterPlayerMovedData.state) {
      case 0:
        // block player from moving
        $gamePlayer._vehicleGettingOn = true;
        // check player action done
        if (!TimeUtils.actionDone) {
          setTimeout(TimeUtils.afterPlayerMoved, 1);
          return;
        }
        CharUtils.decreaseNutrition($gamePlayer);
        if (!timeSpent) {
          timeSpent = CharUtils.getActionTime(BattleUtils.getRealTarget($gamePlayer));
        }
        TimeUtils.afterPlayerMovedData.timeSpent = timeSpent;

        // check trap
        TrapUtils.checkTrapStepped($gamePlayer);

        // update food status
        ItemUtils.updateFoodStatus();
        TimeUtils.afterPlayerMovedData.state = 1;
      case 1:
        $gameActors.actor(1).lastTimeMoved += TimeUtils.afterPlayerMovedData.timeSpent;
        TimeUtils.afterPlayerMovedData.tempTimeSpent = TimeUtils.afterPlayerMovedData.timeSpent;
        TimeUtils.afterPlayerMovedData.state = 2;
      case 2:
        if (TimeUtils.afterPlayerMovedData.tempTimeSpent > 0) {
          var updateTime = (TimeUtils.afterPlayerMovedData.tempTimeSpent - $gameVariables[0].gameTimeAmp >= 0) 
            ? $gameVariables[0].gameTimeAmp : TimeUtils.afterPlayerMovedData.tempTimeSpent;
          TimeUtils.afterPlayerMovedData.tempTimeSpent -= updateTime;
          $gameVariables[0].gameTime += updateTime;
          var gameTurn = Math.floor($gameVariables[0].gameTime / $gameVariables[0].gameTimeAmp);
          if (gameTurn % 10 == 0) {
            // player & mob regen
            CharUtils.regenerate($gamePlayer);
            for (let i = 0; i < $gameMap._events.length; i++) {
              let event = $gameMap._events[i];
              if (event && !event._erased && event.type == 'MOB') {
                CharUtils.regenerate(event);
              }
            }
          }
          if (gameTurn % 20 == 0) {
            MapUtils.addMobToNowMap();
          }
          TimeUtils.afterPlayerMovedData.state = 3;
        } else {
          TimeUtils.afterPlayerMovedData.state = 7;
          return TimeUtils.afterPlayerMoved();
        }
      case 3:
        TimeUtils.afterPlayerMovedData.done = true;
        TimeUtils.afterPlayerMovedData.mobIndex = -1;
        TimeUtils.afterPlayerMovedData.state = 4;
      case 4:
        TimeUtils.afterPlayerMovedData.mobIndex++;
        if (TimeUtils.afterPlayerMovedData.mobIndex >= $gameMap._events.length) {
          TimeUtils.afterPlayerMovedData.state = 6;
          return TimeUtils.afterPlayerMoved();
        }
        if ($gameActors.actor(1)._hp <= 0) {
          // player died, stop mob action
          TimeUtils.afterPlayerMovedData.state = 7;
          return TimeUtils.afterPlayerMoved();
        }
        var event = $gameMap._events[TimeUtils.afterPlayerMovedData.mobIndex];
        if (!event || event._erased) {
          return TimeUtils.afterPlayerMoved();
        }
        if (event.type == 'MOB'
          && $gameVariables[0].gameTime - event.mob.lastTimeMoved >= CharUtils.getActionTime(event.mob)) {
          TimeUtils.afterPlayerMovedData.done = false;
          event.mob.lastTimeMoved += CharUtils.getActionTime(event.mob);
          TimeUtils.afterPlayerMovedData.state = 5;
          event.action();
        } else {
          return TimeUtils.afterPlayerMoved();
        }
        return;
      case 5:
        var event = $gameMap._events[TimeUtils.afterPlayerMovedData.mobIndex];
        // check trap
        TrapUtils.checkTrapStepped(event);
        CharUtils.updateStatus(event);
        CharUtils.updateTp(event);
        TimeUtils.afterPlayerMovedData.state = 4;
        return TimeUtils.afterPlayerMoved();
      case 6:
        if (!TimeUtils.afterPlayerMovedData.done) {
          TimeUtils.afterPlayerMovedData.state = 3;
          return TimeUtils.afterPlayerMoved();
        }
        // update trap record
        TrapUtils.updateLastTriggered();
        TimeUtils.afterPlayerMovedData.state = 2;
        return TimeUtils.afterPlayerMoved();
      case 7:
        // play queued anime
        CharUtils.updateStatus($gamePlayer);
        TimeUtils.playAnime();
        TimeUtils.afterPlayerMovedData.state = 8;
      case 8:
        if (TimeUtils.isAnimePlaying) {
          // wait until animation done
          setTimeout(TimeUtils.afterPlayerMoved, 0);
          return;
        } else {
          // deal with energy calculation
          if (playerDashed) {
            // huge movement, do nothing
          } else {
            CharUtils.updateTp($gamePlayer);
          }
          MapUtils.refreshMap();

          $gameActors.actor(1).attacked = false;
          $gameActors.actor(1).moved = false;
          playerDashed = false;
          if ($gameActors.actor(1).status.paralyzeCount > 0 || $gameActors.actor(1).status.sleepCount > 0
            || $gameActors.actor(1).status.faintCount > 0) {
            TimeUtils.afterPlayerMovedData.state = 1;
            return TimeUtils.afterPlayerMoved();
          }
          // player moveable again
          $gamePlayer._vehicleGettingOn = false;
          TimeUtils.afterPlayerMovedData.state = 0;
          return;
        }
    }
  }

  // original logic (2021/5/15), keep it
  // TimeUtils.afterPlayerMoved = function (timeSpent) {
  //   // block player from moving
  //   $gamePlayer._vehicleGettingOn = true;
  //   var player = $gameActors.actor(1);
  //   CharUtils.decreaseNutrition($gamePlayer);
  //   if (!timeSpent) {
  //     timeSpent = CharUtils.getActionTime(player);
  //   }

  //   // check trap
  //   TrapUtils.checkTrapStepped($gamePlayer);

  //   // update food status
  //   ItemUtils.updateFoodStatus();

  //   do {
  //     player.lastTimeMoved += timeSpent;
  //     let tempTimeSpent = timeSpent;
  //     while (tempTimeSpent > 0) {
  //       var updateTime = (tempTimeSpent - $gameVariables[0].gameTimeAmp >= 0) ? $gameVariables[0].gameTimeAmp : tempTimeSpent;
  //       tempTimeSpent -= updateTime;
  //       $gameVariables[0].gameTime += updateTime;
  //       var gameTurn = Math.floor($gameVariables[0].gameTime / $gameVariables[0].gameTimeAmp);
  //       if (gameTurn % 10 == 0) {
  //         // player & mob regen
  //         CharUtils.regenerate($gamePlayer);
  //         for (let i = 0; i < $gameMap._events.length; i++) {
  //           if (event && !event._erased && event.type == 'MOB') {
  //             CharUtils.regenerate(event);
  //           }
  //         }
  //       }
  //       if (gameTurn % 20 == 0) {
  //         MapUtils.addMobToNowMap();
  //       }
  //       // update all mobs & items
  //       let done;
  //       do {
  //         done = true;
  //         for (var i = 0; i < $gameMap._events.length; i++) {
  //           if (player._hp <= 0) {
  //             // player died, stop mob action
  //             break;
  //           }
  //           var event = $gameMap._events[i];
  //           if (!event || event._erased) {
  //             continue;
  //           }
  //           // TODO: implement mob action speed
  //           if (event.type == 'MOB'
  //             && $gameVariables[0].gameTime - event.mob.lastTimeMoved >= CharUtils.getActionTime(event.mob)) {
  //             done = false;
  //             event.mob.lastTimeMoved += CharUtils.getActionTime(event.mob);
  //             event.action();
  //             // check trap
  //             TrapUtils.checkTrapStepped(event);
  //             CharUtils.updateStatus(event);
  //             CharUtils.updateTp(event);
  //           }
  //         }
  //       } while (!done);
  //       // update trap record
  //       TrapUtils.updateLastTriggered();
  //     }
  //     // play queued anime
  //     CharUtils.updateStatus($gamePlayer);
  //     TimeUtils.playAnime();
  //     // deal with energy calculation
  //     if (playerDashed) {
  //       // huge movement, do nothing
  //     } else {
  //       CharUtils.updateTp($gamePlayer);
  //     }
  //     MapUtils.refreshMap();

  //     player.attacked = false;
  //     $gameActors.actor(1).moved = false;
  //     playerDashed = false;
  //   } while (player.status.paralyzeCount > 0 || player.status.sleepCount > 0
  //     || player.status.faintCount > 0); // check if player unable to move

  //   // player moveable again
  //   $gamePlayer._vehicleGettingOn = false;
  // }

  //-----------------------------------------------------------------------------------
  // BattleUtils
  //
  // handles battle on map
  BattleUtils = function () {
    throw new Error('This is a static class');
  }

  BattleUtils.getRealTarget = function(src) {
    return (src == $gamePlayer) ? $gameActors.actor(1) : src.mob;
  }

  // realSrc can be null, which means realTarget died on his own
  BattleUtils.checkTargetAlive = function(realSrc, realTarget, target) {
    if (realTarget._hp <= 0) {
      let msg;
      if (realSrc) {
        msg = String.format(Message.display('targetKilled'), LogUtils.getCharName(realTarget)
          , LogUtils.getCharName(realSrc));
      } else {
        msg = String.format(Message.display('targetDied'), LogUtils.getCharName(realTarget));
      }
      LogUtils.addLog(msg);
      if (target == $gamePlayer) {
        BattleUtils.playerDied(msg);
      } else {
        target.looting();
        if (realSrc) {
          let exp = Math.round(Soul_Chick.expAfterAmplify(realTarget.exp()));
          realSrc.gainExpLvGap(realTarget, exp);
        }
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

  BattleUtils.rollWeaponDamage = function(formula) {
    if (Number.isInteger(formula)) {
      return formula;
    }
    let temps = formula.split('d');
    if (temps.length == 1) {
      // no dice
      return Number.parseInt(formula);
    }
    let splitter = (temps[1].includes('+')) ? '+' : '-';
    let temps2 = temps[1].split(splitter);
    let bonus = (temps2[1]) ? Number.parseInt(temps2[1]) : 0;
    if (splitter == '-') {
      bonus *= -1;
    }
    let result = dice(Number.parseInt(temps[0]), Number.parseInt(temps2[0])) + bonus;
    if (result < 0) {
      result = 0;
    }
    return result;
  }

  BattleUtils.calcPhysicalDamage = function(realSrc, realTarget, weaponBonus, skillAmplify) {
    if (realSrc == $gameActors.actor(1)) {
      CharUtils.playerGainStrExp(1);
    }
    // calculate attack damage
    let weaponDamage = (BattleUtils.rollWeaponDamage(realSrc.param(10)) + weaponBonus) * (1 + realSrc.param(2) / 200);
    let attrDamage = 2 * (realSrc.level / 4 + realSrc.param(2) + realSrc.param(7) / 3);
    let attrDef = (realTarget.level + realTarget.param(3)) / 2 + realTarget.param(6) / 5;
    let equipDef = realTarget.param(8);
    let damage = Math.round(((weaponDamage + attrDamage) * skillAmplify - equipDef - attrDef) / 4);
    return BattleUtils.getFinalDamage(damage);
  }

  BattleUtils.calcProjectileDamage = function(realSrc, realTarget, item, weaponBonus, skillAmplify) {
    if (realSrc == $gameActors.actor(1)) {
      CharUtils.playerGainStrExp(1);
    }
    // calculate projectile damage
    let weaponDamage = (BattleUtils.rollWeaponDamage(item.damage) + weaponBonus) * (1 + realSrc.param(2) / 200);
    let attrDamage = 2 * (realSrc.level / 4 + realSrc.param(2) + realSrc.param(7) / 3);
    let attrDef = (realTarget.level + realTarget.param(3)) / 2 + realTarget.param(6) / 5;
    let equipDef = realTarget.param(8);
    let damage = Math.round(((weaponDamage + attrDamage) * skillAmplify - equipDef - attrDef) / 4);
    return BattleUtils.getFinalDamage(damage);
  }

  BattleUtils.getWeaponClass = function(realSrc) {
    let skillClass;
    if (realSrc._equips && realSrc._equips[0].itemId() != 0) {
      let prop = JSON.parse($dataWeapons[realSrc._equips[0].itemId()].note);
      // TODO: implement weapon types
      switch (prop.subType) {
        default:
          skillClass = Skill_MartialArt;
          break;
      }
    } else { // martial art
      skillClass = Skill_MartialArt;
    }
    return skillClass;
  }

  BattleUtils.getWeaponSkill = function(realSrc) {
    let skillClass = BattleUtils.getWeaponClass(realSrc);

    for (let id in realSrc._skills) {
      if (realSrc._skills[id].constructor.name == skillClass.name) {
        return realSrc._skills[id];
      }
    }
    return null;
  }

  BattleUtils.meleeAttack = function (src, target) {
    var realSrc = BattleUtils.getRealTarget(src);
    var realTarget = BattleUtils.getRealTarget(target);
    if (realSrc._tp < attackTpCost) {
      if (src == $gamePlayer) {
        MapUtils.displayMessage(Message.display('noEnergy'));
      }
      return false;
    } else {
      CharUtils.decreaseTp(realSrc, attackTpCost);
    }

    // calculate the damage
    let weaponBonus = 0;
    if (realSrc == $gameActors.actor(1)) {
      let weaponSkill = BattleUtils.getWeaponSkill(realSrc);
      if (weaponSkill) {
        let prop = window[weaponSkill.constructor.name].prop;
        let index = weaponSkill.lv;
        weaponBonus = prop.effect[index].atk;
        weaponSkill.exp += Soul_Chick.expAfterAmplify(1);
        if (prop.effect[index].levelUp != -1 && weaponSkill.exp >= prop.effect[index].levelUp) {
          let msg = String.format(Message.display('skillLevelUp'), weaponSkill.name);
          $gameMessage.add(msg);
          LogUtils.addLog(msg);
          weaponSkill.lv++;
          weaponSkill.exp = 0;
        }
      } else {
        let skillClass = BattleUtils.getWeaponClass(realSrc);
        let newWeaponSkill = new skillClass();
        realSrc._skills.push(newWeaponSkill);
        newWeaponSkill.lv = 0;
        newWeaponSkill.exp = 1;
      }
    }

    let value = BattleUtils.calcPhysicalDamage(realSrc, realTarget, weaponBonus, 1);
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('meleeAttack'), LogUtils.getCharName(realSrc)
      , LogUtils.getCharName(realTarget), value));
    CharUtils.decreaseHp(realTarget, value);
    CharUtils.updateSleepCountWhenHit(realTarget);
    // hit animation
    TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 16));
    BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    if (src == $gamePlayer) {
      $gameActors.actor(1).attacked = true;
      TimeUtils.afterPlayerMoved();
    }
    return true;
  }

  // for throwing projectile to enemy
  BattleUtils.projectileAttack = function (src, target, item) {
    var realSrc = BattleUtils.getRealTarget(src);
    var realTarget = BattleUtils.getRealTarget(target);

    // calculate the damage
    let weaponBonus = 0;
    let skillClass = Skill_Throwing;
    if (realSrc == $gameActors.actor(1)) {
      let weaponSkill;
      for (let id in realSrc._skills) {
        if (realSrc._skills[id].constructor.name == skillClass.name) {
          weaponSkill = realSrc._skills[id];
          break;
        }
      }
      if (weaponSkill) {
        let prop = window[weaponSkill.constructor.name].prop;
        let index = weaponSkill.lv;
        weaponBonus = prop.effect[index].atk;
        weaponSkill.exp += Soul_Chick.expAfterAmplify(1);
        if (prop.effect[index].levelUp != -1 && weaponSkill.exp >= prop.effect[index].levelUp) {
          let msg = String.format(Message.display('skillLevelUp'), weaponSkill.name);
          $gameMessage.add(msg);
          LogUtils.addLog(msg);
          weaponSkill.lv++;
          weaponSkill.exp = 0;
        }
      } else {
        let newWeaponSkill = new skillClass();
        realSrc._skills.push(newWeaponSkill);
        newWeaponSkill.lv = 0;
        newWeaponSkill.exp = 1;
      }
    }

    // TODO: implement projectile damage
    let value = BattleUtils.calcProjectileDamage(realSrc, realTarget, item, weaponBonus, 1);
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
      , item.name, LogUtils.getCharName(realTarget), value));
    CharUtils.decreaseHp(realTarget, value);
    CharUtils.updateSleepCountWhenHit(realTarget);
    // hit animation
    TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 16));
    BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    return true;
  }

  BattleUtils.playerDied = function (msg) {
    // TODO: implement statistics data/log
    $gameMessage.add(msg);
    LogUtils.addLog(msg);
    var waitFunction = function () {
      if ($gameMessage.isBusy()) {
        setTimeout(waitFunction, 100);
      } else {
        SceneManager.goto(Scene_Gameover);
      }
    }
    waitFunction();
  }

  BattleUtils.getFinalDamage = function(value) {
    if (value < 0) {
      value = 0;
    } else {
      value = Math.round(value * getRandomIntRange(80, 121) / 100);
    }
    return value;
  }

  //-----------------------------------------------------------------------------------
  // ItemUtils
  //
  // deal with item related methods
  ItemUtils = function () {
    throw new Error('This is a static class');
  }

  ItemUtils.potionTemplates = [];
  ItemUtils.scrollTemplates = [];
  ItemUtils.lootingTemplates = {
    skin: [],
    tooth: [],
    claw: [],
    bone: [],
    material: []
  }
  ItemUtils.EquipTemplates = {
    helmet: [],
    gloves: [],
    shoes: [],
    shield: [],
    coat: []
  }
  ItemUtils.recipes = [];

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
      case 'FOOD': case 'SKILL': case 'SOUL': case 'MATERIAL': case 'DART':
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
        case 'POTION':
          displayName = $gameVariables[0].itemImageData.potions[item.id].name;
          break;
        case 'SCROLL':
          displayName = $gameVariables[0].itemImageData.scrolls[item.id].name;
          break;
        case 'WEAPON': case 'ARMOR':
          displayName = item.templateName;
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

  ItemUtils.getAttributeName = function(index) {
    let result = '';
    switch (index) {
      case 0:
        result = 'HP';
        break;
      case 1:
        result = 'MP';
        break;
      case 2:
        result = '力量';
        break;
      case 3:
        result = '體格';
        break;
      case 4:
        result = '智力';
        break;
      case 5:
        result = '睿智';
        break;
      case 6:
        result = '敏捷';
        break;
      case 7:
        result = '運氣';
        break;
    }
    return result;
  }

  ItemUtils.updateEquipDescription = function(item) {
    let result = '\n';
    for (let i = 0; i < 8; i++) {
      if (item.params[i] != 0) {
        result += ItemUtils.getAttributeName(i);
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
            result += attr.value + ' ';
            break;
        }
        if (attr.dataId != 2) {
          result += ItemUtils.showNumberWithSign(Math.round(attr.value * 100)) + ' ';
        }
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
    let prop = JSON.parse(obj.note);
    if (DataManager.isItem(obj)) {
      switch (prop.type) {
        case 'POTION':
          imageData = $gameVariables[0].itemImageData.potions[obj.id];
          break;
        case 'SCROLL':
          imageData = $gameVariables[0].itemImageData.scrolls[obj.id];
          break;
        default:
          imageData = $gameVariables[0].itemImageData.items[obj.id];
          break;
      }
    } else if (DataManager.isWeapon(obj)) {
      switch (prop.subType) {
        case 'TOOTH':
          imageData = new ImageData('Collections3', 1, 2, 6);
          break;
        case 'BONE':
          imageData = new ImageData('Collections3', 0, 2, 6);
          break;
        case 'CLAW':
          imageData = new ImageData('Collections3', 0, 0, 6);
          break;
      }
    } else if (DataManager.isArmor(obj)) {
      switch (prop.subType) {
        case 'SKIN':
          imageData = new ImageData('Collections3', 0, 1, 6);
          break;
        case 'SHOES':
          imageData = new ImageData('Collections2', 4, 0, 6);
          break;
        case 'GLOVES':
          imageData = new ImageData('Collections2', 6, 1, 6);
          break;
        case 'SHIELD':
          imageData = new ImageData('Collections2', 4, 0, 2);
          break;
        case 'HELMET':
          imageData = new ImageData('Collections2', 7, 1, 4);
          break;
        case 'COAT':
          imageData = new ImageData('Collections2', 4, 1, 4);
          break;
      }
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
        MapUtils.drawImage(event, imageData, 255);
        // setup last image
        event.itemPile.lastImage = imageData;
      }
    } else if (event.itemPile.lastImage.image) {
      // show last image player saw
      MapUtils.drawImage(event, event.itemPile.lastImage, 128);
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
    let nowValue = ItemUtils.getEnchantment(equip);
    nowValue += value;
    let newName = temp[0];
    if (nowValue > 0) {
      newName += '+' + nowValue;
    } else if (nowValue < 0) {
      newName += nowValue;
    }
    equip.name = newName;
    let prop = JSON.parse(equip.note);
    for (let id in equip.traits) {
      let toCheck = equip.traits[id];
      if (toCheck.code == 22) {
        if (prop.type == 'WEAPON' && toCheck.dataId == 2) {
          let weaponBonus = ItemUtils.getEnchantment({name: toCheck.value});
          weaponBonus += value;
          toCheck.value =  toCheck.value.split(/\+|-/)[0];
          if (weaponBonus > 0) {
            toCheck.value += '+' + weaponBonus;
          } else if (weaponBonus < 0) {
            toCheck.value += weaponBonus;
          }
        } else if (prop.type == 'ARMOR' && toCheck.dataId == 0) {
          ItemUtils.modifyAttr(toCheck, value);
        }
      }
    }
    ItemUtils.updateEquipDescription(equip);
  }

  ItemUtils.spawnItemFromList = function(list, dungeonLevel) {
    let probs = []; // item: {itemClass: class, prob: float}
    for (let id in list) {
      let p = 100 - Math.abs(dungeonLevel - list[id].spawnLevel) * 20;
      p = (p < 0) ? 0 : p;
      probs.push({itemClass: list[id], prob: p});
    }
    let totalProb = 0;
    for (let id in probs) {
      totalProb += probs[id].prob;
    }
    for (let id in probs) {
      probs[id].prob /= totalProb;
    }
    probs.sort(function(a, b) {
      return b.prob - a.prob;
    });
    let indicator = getRandomInt(100) / 100;
    let compareProb = 0;
    for (let id in probs) {
      compareProb += probs[id].prob;
      if (indicator < compareProb) {
        return new probs[id].itemClass();
      }
    }
    return new list[getRandomInt(list.length)]();
  }

  ItemUtils.spawnItem = function(dungeonLevel) {
    let list;
    let itemType = getRandomInt(100);
    if (itemType < 80) {
      // spawn material
      let indicator = getRandomInt(5);
      switch (indicator) {
        case 0: // skin
          list = ItemUtils.lootingTemplates.skin;
          break;
        case 1: // tooth
          list = ItemUtils.lootingTemplates.tooth;
          break;
        case 2: // claw
          list = ItemUtils.lootingTemplates.claw;
          break;
        case 3: // bone
          list = ItemUtils.lootingTemplates.bone;
          break;
        case 4: // material
          list = ItemUtils.lootingTemplates.material;
          break;
      }
      return ItemUtils.spawnItemFromList(list, dungeonLevel);
    } else if (itemType < 95) {
      // spawn scroll/potion
      if (getRandomInt(2) == 0) {
        // scroll
        list = ItemUtils.scrollTemplates;
      } else {
        list = ItemUtils.potionTemplates;
      }
      return new list[getRandomInt(list.length)]();
    } else {
      // spawn equipment
      let indicator = getRandomInt(5);
      switch (indicator) {
        case 0: // helmet
          list = ItemUtils.EquipTemplates.helmet;
          break;
        case 1: // gloves
          list = ItemUtils.EquipTemplates.gloves;
          break;
        case 2: // shoes
          list = ItemUtils.EquipTemplates.shoes;
          break;
        case 3: // shield
          list = ItemUtils.EquipTemplates.shield;
          break;
        case 4: // coat
          list = ItemUtils.EquipTemplates.coat;
          break;
      }
      return ItemUtils.spawnItemFromList(list, dungeonLevel);
    }
  }

  ItemUtils.checkFoodTime = function(food, isInventory, itemPileEvent) {
    if (food.duration) {
      if (food.status == 'FRESH'
        && $gameVariables[0].gameTime - food.producedTime >= food.duration * $gameVariables[0].gameTimeAmp) {
        if (isInventory) {
          LogUtils.addLog(String.format(Message.display('foodRot'), food.name));
        } else if (CharUtils.playerCanSeeBlock(itemPileEvent._x, itemPileEvent._y)) {
          LogUtils.addLog(String.format(Message.display('foodRotGround'), food.name));
        }
        food.name = Message.display('rotten') + food.name;
        food.description += '\n' + Message.display('rottenDescription');
        food.status = 'ROTTEN';
        food.producedTime = $gameVariables[0].gameTime;
      } else if ($gameVariables[0].gameTime - food.producedTime >= food.duration * $gameVariables[0].gameTimeAmp * 2) {
        if (isInventory) {
          LogUtils.addLog(String.format(Message.display('foodRotAway'), food.name));
          $gameParty._items.splice($gameParty._items.indexOf(food), 1);
        } else if (CharUtils.playerCanSeeBlock(itemPileEvent._x, itemPileEvent._y)) {
          LogUtils.addLog(String.format(Message.display('foodRotAwayGround'), food.name));
          ItemUtils.removeItemFromItemPile(itemPileEvent._x, itemPileEvent._y, food);
        }
      }
    }
  }

  ItemUtils.updateFoodStatus = function() {
    // update player inventory
    let foodList = $gameParty._items.filter(function(item) {
      if (item) {
        let prop = JSON.parse(item.note);
        return prop.type == 'FOOD';
      }
      return false;
    });
    for (let id in foodList) {
      let food = foodList[id];
      ItemUtils.checkFoodTime(food, true);
    }

    // update itemPiles
    let itemPiles = $gameMap.events().filter(function(item) {
      return item.type == 'ITEM_PILE';
    });
    for (let id in itemPiles) {
      let evt = itemPiles[id];
      let foodList = evt.itemPile.objectStack.filter(function(item) {
        if (item) {
          let prop = JSON.parse(item.note);
          return prop.type == 'FOOD';
        }
        return false;
      });
      for (let id2 in foodList) {
        let food = foodList[id2];
        ItemUtils.checkFoodTime(food, false, evt);
      }
    }
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
  // EquipTemplate
  //
  // deal with BUC states

  EquipTemplate = function() {
    this.initialize.apply(this, arguments);
  }

  EquipTemplate.prototype = Object.create(ItemTemplate.prototype);
  EquipTemplate.prototype.constructor = EquipTemplate;

  EquipTemplate.prototype.initialize = function (template) {
    ItemTemplate.prototype.initialize.call(this, template);
    if (getRandomInt(10) < 3) {
      if (getRandomInt(2) == 1) {
        this.bucState = 1;
      } else {
        this.bucState = -1;
      }
    }
  };

  //-----------------------------------------------------------------------------------
  // Feather
  //
  // type: MATERIAL

  Feather = function() {
    this.initialize.apply(this, arguments);
  }
  Feather.spawnLevel = 3;

  Feather.prototype = Object.create(ItemTemplate.prototype);
  Feather.prototype.constructor = Feather;

  Feather.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[12]);
  }
  ItemUtils.lootingTemplates.material.push(Feather);

  //-----------------------------------------------------------------------------------
  // Flesh (for animal)
  //
  // type: FOOD

  Flesh = function() {
    this.initialize.apply(this, arguments);
  }

  Flesh.prototype = Object.create(ItemTemplate.prototype);
  Flesh.prototype.constructor = Flesh;

  Flesh.prototype.initialize = function (mob, nutrition, duration, status) {
    ItemTemplate.prototype.initialize.call(this, $dataItems[11]);
    this.name = String.format(Message.display('animalMeat'), mob.name());
    this.description = '動物的肉';
    this.templateName = this.name;
    this.nutrition = nutrition;
    this.duration = duration;
    this.status = status; // FRESH, ROTTEN
    this.producedTime = $gameVariables[0].gameTime;
  }

  //-----------------------------------------------------------------------------------
  // Honey
  //
  // type: FOOD

  Honey = function() {
    this.initialize.apply(this, arguments);
  }
  Honey.spawnLevel = 2;

  Honey.prototype = Object.create(ItemTemplate.prototype);
  Honey.prototype.constructor = Honey;

  Honey.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[14]);
    this.name = '蜂蜜'
    this.description = '好吃又營養';
    this.templateName = this.name;
    this.nutrition = 300;
    this.status = 'PERMANENT'; // never rots
    this.producedTime = $gameVariables[0].gameTime;
  }
  ItemUtils.lootingTemplates.material.push(Honey);

  //-----------------------------------------------------------------------------------
  // Bee_Sting
  //
  // weapon type: TOOTH

  Bee_Sting = function() {
    this.initialize.apply(this, arguments);
  }
  Bee_Sting.spawnLevel = 1;

  Bee_Sting.prototype = Object.create(EquipTemplate.prototype);
  Bee_Sting.prototype.constructor = Bee_Sting;

  Bee_Sting.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '蜂刺';
    this.description = '細長的蜜蜂尾刺';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 2);
    modifier += this.bucState;
    this.traits[2].value = '1d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Bee_Sting);

  //-----------------------------------------------------------------------------------
  // Dog_Tooth
  //
  // weapon type: TOOTH

  Dog_Tooth = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Tooth.spawnLevel = 1;

  Dog_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Dog_Tooth.prototype.constructor = Dog_Tooth;

  Dog_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '犬牙';
    this.description = '剛長出來不久的牙齒';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Dog_Tooth);

  //-----------------------------------------------------------------------------------
  // Rooster_Tooth
  //
  // weapon type: TOOTH

  Rooster_Tooth = function() {
    this.initialize.apply(this, arguments);
  }
  Rooster_Tooth.spawnLevel = 3;

  Rooster_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Rooster_Tooth.prototype.constructor = Rooster_Tooth;

  Rooster_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '雞喙';
    this.description = '被啄到會很痛';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Rooster_Tooth);

  //-----------------------------------------------------------------------------------
  // Cat_Tooth
  //
  // weapon type: TOOTH

  Cat_Tooth = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Tooth.spawnLevel = 4;

  Cat_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Cat_Tooth.prototype.constructor = Cat_Tooth;

  Cat_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '貓牙';
    this.description = '尖銳的牙齒';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d5';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Cat_Tooth);

  //-----------------------------------------------------------------------------------
  // Boar_Tooth
  //
  // weapon type: TOOTH

  Boar_Tooth = function() {
    this.initialize.apply(this, arguments);
  }
  Boar_Tooth.spawnLevel = 5;

  Boar_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Boar_Tooth.prototype.constructor = Boar_Tooth;

  Boar_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '野豬牙';
    this.description = '彎曲的牙齒';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '1d5';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Boar_Tooth);

  //-----------------------------------------------------------------------------------
  // Wolf_Tooth
  //
  // weapon type: TOOTH

  Wolf_Tooth = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Tooth.spawnLevel = 6;

  Wolf_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Tooth.prototype.constructor = Wolf_Tooth;

  Wolf_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '狼牙';
    this.description = '堅韌的牙齒';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d6';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.tooth.push(Wolf_Tooth);

  //-----------------------------------------------------------------------------------
  // Dog_Bone
  //
  // weapon type: BONE

  Dog_Bone = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Bone.spawnLevel = 1;

  Dog_Bone.prototype = Object.create(EquipTemplate.prototype);
  Dog_Bone.prototype.constructor = Dog_Bone;

  Dog_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '犬骨';
    this.description = '棒狀的骨頭';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1';
    // TODO: implement magic power amplifier
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.bone.push(Dog_Bone);

  //-----------------------------------------------------------------------------------
  // Wolf_Bone
  //
  // weapon type: BONE

  Wolf_Bone = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Bone.spawnLevel = 6;

  Wolf_Bone.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Bone.prototype.constructor = Wolf_Bone;

  Wolf_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '狼骨';
    this.description = '又輕又堅韌的骨頭';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '2';
    // TODO: implement magic power amplifier
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.bone.push(Wolf_Bone);

  //-----------------------------------------------------------------------------------
  // Bear_Bone
  //
  // weapon type: BONE

  Bear_Bone = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Bone.spawnLevel = 6;

  Bear_Bone.prototype = Object.create(EquipTemplate.prototype);
  Bear_Bone.prototype.constructor = Bear_Bone;

  Bear_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '熊骨';
    this.description = '厚實堅韌的骨頭';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '3';
    // TODO: implement magic power amplifier
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.bone.push(Bear_Bone);

  //-----------------------------------------------------------------------------------
  // Rooster_Claw
  //
  // weapon type: CLAW

  Rooster_Claw = function() {
    this.initialize.apply(this, arguments);
  }
  Rooster_Claw.spawnLevel = 3;

  Rooster_Claw.prototype = Object.create(EquipTemplate.prototype);
  Rooster_Claw.prototype.constructor = Rooster_Claw;

  Rooster_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '雞爪';
    this.description = '調理後會很好吃?';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '2d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.claw.push(Rooster_Claw);

  //-----------------------------------------------------------------------------------
  // Cat_Claw
  //
  // weapon type: CLAW

  Cat_Claw = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Claw.spawnLevel = 4;

  Cat_Claw.prototype = Object.create(EquipTemplate.prototype);
  Cat_Claw.prototype.constructor = Cat_Claw;

  Cat_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '貓爪';
    this.description = '可以輕易撕開皮膚';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 5);
    modifier += this.bucState;
    this.traits[2].value = '2d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.claw.push(Cat_Claw);

  //-----------------------------------------------------------------------------------
  // Wolf_Claw
  //
  // weapon type: CLAW

  Wolf_Claw = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Claw.spawnLevel = 6;

  Wolf_Claw.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Claw.prototype.constructor = Wolf_Claw;

  Wolf_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '狼爪';
    this.description = '粗長又銳利的爪';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 5);
    modifier += this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.claw.push(Wolf_Claw);

  //-----------------------------------------------------------------------------------
  // Bear_Claw
  //
  // weapon type: CLAW

  Bear_Claw = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Claw.spawnLevel = 6;

  Bear_Claw.prototype = Object.create(EquipTemplate.prototype);
  Bear_Claw.prototype.constructor = Bear_Claw;

  Bear_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '熊爪';
    this.description = '厚實堅韌的爪';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates.claw.push(Bear_Claw);

  //-----------------------------------------------------------------------------------
  // Dog_Skin
  //
  // armor type: SKIN

  Dog_Skin = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Skin.spawnLevel = 1;

  Dog_Skin.prototype = Object.create(EquipTemplate.prototype);
  Dog_Skin.prototype.constructor = Dog_Skin;

  Dog_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '犬皮';
    this.description = '髒兮兮的薄皮';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates.skin.push(Dog_Skin);

  //-----------------------------------------------------------------------------------
  // Cat_Skin
  //
  // armor type: SKIN

  Cat_Skin = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Skin.spawnLevel = 4;

  Cat_Skin.prototype = Object.create(EquipTemplate.prototype);
  Cat_Skin.prototype.constructor = Cat_Skin;

  Cat_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '貓皮';
    this.description = '泛著光澤的皮';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 1);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates.skin.push(Cat_Skin);

  //-----------------------------------------------------------------------------------
  // Wolf_Skin
  //
  // armor type: SKIN

  Wolf_Skin = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Skin.spawnLevel = 6;

  Wolf_Skin.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Skin.prototype.constructor = Wolf_Skin;

  Wolf_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '狼皮';
    this.description = '堅韌的毛皮';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates.skin.push(Wolf_Skin);

  //-----------------------------------------------------------------------------------
  // Bear_Skin
  //
  // armor type: SKIN

  Bear_Skin = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Skin.spawnLevel = 6;

  Bear_Skin.prototype = Object.create(EquipTemplate.prototype);
  Bear_Skin.prototype.constructor = Bear_Skin;

  Bear_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '熊皮';
    this.description = '厚實的毛皮';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates.skin.push(Bear_Skin);

  //-----------------------------------------------------------------------------------
  // Turtle_Shell
  //
  // armor type: SHIELD

  Turtle_Shell = function() {
    this.initialize.apply(this, arguments);
  }
  Turtle_Shell.spawnLevel = 6;

  Turtle_Shell.prototype = Object.create(EquipTemplate.prototype);
  Turtle_Shell.prototype.constructor = Turtle_Shell;

  Turtle_Shell.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[17]);
    this.name = '龜殼';
    this.description = '堅硬的殼';
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates.skin.push(Turtle_Shell);

  //-----------------------------------------------------------------------------------
  // Dart_Lv1_T1
  //
  // type: DART

  Dart_Lv1_T1 = function() {
    this.initialize.apply(this, arguments);
  }
  Dart_Lv1_T1.spawnLevel = 1;

  Dart_Lv1_T1.itemName = '飛鏢Lv1';
  Dart_Lv1_T1.itemDescription = '射向敵人造成傷害';
  Dart_Lv1_T1.material = [{itemClass: Feather, amount: 1}, {itemClass: Dog_Tooth, amount: 1}];

  Dart_Lv1_T1.prototype = Object.create(ItemTemplate.prototype);
  Dart_Lv1_T1.prototype.constructor = Dart_Lv1_T1;

  Dart_Lv1_T1.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d8';
    this.name = Dart_Lv1_T1.itemName;
    this.description = Dart_Lv1_T1.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
  }
  ItemUtils.recipes.push(Dart_Lv1_T1);
  ItemUtils.lootingTemplates.material.push(Dart_Lv1_T1);

  //-----------------------------------------------------------------------------------
  // Dart_Lv1_T2
  //
  // type: DART

  Dart_Lv1_T2 = function() {
    this.initialize.apply(this, arguments);
  }
  Dart_Lv1_T2.spawnLevel = 1;

  Dart_Lv1_T2.itemName = '飛鏢Lv1';
  Dart_Lv1_T2.itemDescription = '射向敵人造成傷害';
  Dart_Lv1_T2.material = [{itemClass: Feather, amount: 1}, {itemClass: Rooster_Tooth, amount: 1}];

  Dart_Lv1_T2.prototype = Object.create(ItemTemplate.prototype);
  Dart_Lv1_T2.prototype.constructor = Dart_Lv1_T2;

  Dart_Lv1_T2.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d8';
    this.name = Dart_Lv1_T2.itemName;
    this.description = Dart_Lv1_T2.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
  }
  ItemUtils.recipes.push(Dart_Lv1_T2);
  ItemUtils.lootingTemplates.material.push(Dart_Lv1_T2);

  //-----------------------------------------------------------------------------------
  // Dart_Lv2_T1
  //
  // type: DART

  Dart_Lv2_T1 = function() {
    this.initialize.apply(this, arguments);
  }
  Dart_Lv2_T1.spawnLevel = 4;

  Dart_Lv2_T1.itemName = '飛鏢Lv2';
  Dart_Lv2_T1.itemDescription = '射向敵人造成傷害';
  Dart_Lv2_T1.material = [{itemClass: Feather, amount: 1}, {itemClass: Cat_Tooth, amount: 1}];

  Dart_Lv2_T1.prototype = Object.create(ItemTemplate.prototype);
  Dart_Lv2_T1.prototype.constructor = Dart_Lv2_T1;

  Dart_Lv2_T1.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d12';
    this.name = Dart_Lv2_T1.itemName;
    this.description = Dart_Lv2_T1.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
  }
  ItemUtils.recipes.push(Dart_Lv2_T1);
  ItemUtils.lootingTemplates.material.push(Dart_Lv2_T1);

  //-----------------------------------------------------------------------------------
  // Dart_Lv2_T2
  //
  // type: DART

  Dart_Lv2_T2 = function() {
    this.initialize.apply(this, arguments);
  }
  Dart_Lv2_T2.spawnLevel = 4;

  Dart_Lv2_T2.itemName = '飛鏢Lv2';
  Dart_Lv2_T2.itemDescription = '射向敵人造成傷害';
  Dart_Lv2_T2.material = [{itemClass: Feather, amount: 1}, {itemClass: Wolf_Tooth, amount: 1}];

  Dart_Lv2_T2.prototype = Object.create(ItemTemplate.prototype);
  Dart_Lv2_T2.prototype.constructor = Dart_Lv2_T2;

  Dart_Lv2_T2.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d12';
    this.name = Dart_Lv2_T2.itemName;
    this.description = Dart_Lv2_T2.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
  }
  ItemUtils.recipes.push(Dart_Lv2_T2);
  ItemUtils.lootingTemplates.material.push(Dart_Lv2_T2);

  //-----------------------------------------------------------------------------------
  // Dog_Gloves
  //
  // armor type: GLOVES

  Dog_Gloves = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Gloves.spawnLevel = 1;

  Dog_Gloves.itemName = '狗皮手套';
  Dog_Gloves.itemDescription = '輕薄的手套';
  Dog_Gloves.material = [{itemClass: Dog_Skin, amount: 4}];

  Dog_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Dog_Gloves.prototype.constructor = Dog_Gloves;

  Dog_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Dog_Gloves.itemName;
    this.description = Dog_Gloves.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Gloves);
  ItemUtils.EquipTemplates.gloves.push(Dog_Gloves);

  //-----------------------------------------------------------------------------------
  // Dog_Shoes
  //
  // armor type: SHOES

  Dog_Shoes = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Shoes.spawnLevel = 1;

  Dog_Shoes.itemName = '狗皮靴子';
  Dog_Shoes.itemDescription = '輕薄的靴子';
  Dog_Shoes.material = [{itemClass: Dog_Skin, amount: 4}];

  Dog_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Dog_Shoes.prototype.constructor = Dog_Shoes;

  Dog_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Dog_Shoes.itemName;
    this.description = Dog_Shoes.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Shoes);
  ItemUtils.EquipTemplates.shoes.push(Dog_Shoes);

  //-----------------------------------------------------------------------------------
  // Dog_Shield
  //
  // armor type: SHIELD

  Dog_Shield = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Shield.spawnLevel = 1;

  Dog_Shield.itemName = '狗皮盾';
  Dog_Shield.itemDescription = '簡單的輕盾';
  Dog_Shield.material = [{itemClass: Dog_Skin, amount: 2}, {itemClass: Dog_Bone, amount: 2}];

  Dog_Shield.prototype = Object.create(EquipTemplate.prototype);
  Dog_Shield.prototype.constructor = Dog_Shield;

  Dog_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Dog_Shield.itemName;
    this.description = Dog_Shield.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Shield);
  ItemUtils.EquipTemplates.shield.push(Dog_Shield);

  //-----------------------------------------------------------------------------------
  // Dog_Helmet
  //
  // armor type: HELMET

  Dog_Helmet = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Helmet.spawnLevel = 1;

  Dog_Helmet.itemName = '狗皮帽';
  Dog_Helmet.itemDescription = '輕薄的皮帽';
  Dog_Helmet.material = [{itemClass: Dog_Skin, amount: 4}];

  Dog_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Dog_Helmet.prototype.constructor = Dog_Helmet;

  Dog_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Dog_Helmet.itemName;
    this.description = Dog_Helmet.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Helmet);
  ItemUtils.EquipTemplates.helmet.push(Dog_Helmet);

  //-----------------------------------------------------------------------------------
  // Dog_Coat
  //
  // armor type: COAT

  Dog_Coat = function() {
    this.initialize.apply(this, arguments);
  }
  Dog_Coat.spawnLevel = 1;

  Dog_Coat.itemName = '狗皮大衣';
  Dog_Coat.itemDescription = '輕薄的大衣';
  Dog_Coat.material = [{itemClass: Dog_Skin, amount: 8}];

  Dog_Coat.prototype = Object.create(EquipTemplate.prototype);
  Dog_Coat.prototype.constructor = Dog_Coat;

  Dog_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Dog_Coat.itemName;
    this.description = Dog_Coat.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Coat);
  ItemUtils.EquipTemplates.coat.push(Dog_Coat);

  //-----------------------------------------------------------------------------------
  // Cat_Gloves
  //
  // armor type: GLOVES

  Cat_Gloves = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Gloves.spawnLevel = 4;

  Cat_Gloves.itemName = '貓皮手套';
  Cat_Gloves.itemDescription = '泛著光澤的手套';
  Cat_Gloves.material = [{itemClass: Cat_Skin, amount: 4}];

  Cat_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Cat_Gloves.prototype.constructor = Cat_Gloves;

  Cat_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Cat_Gloves.itemName;
    this.description = Cat_Gloves.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 1);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Gloves);
  ItemUtils.EquipTemplates.gloves.push(Cat_Gloves);

  //-----------------------------------------------------------------------------------
  // Cat_Shoes
  //
  // armor type: SHOES

  Cat_Shoes = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Shoes.spawnLevel = 4;

  Cat_Shoes.itemName = '貓皮靴子';
  Cat_Shoes.itemDescription = '泛著光澤的靴子';
  Cat_Shoes.material = [{itemClass: Cat_Skin, amount: 4}];

  Cat_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Cat_Shoes.prototype.constructor = Cat_Shoes;

  Cat_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Cat_Shoes.itemName;
    this.description = Cat_Shoes.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 1);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Shoes);
  ItemUtils.EquipTemplates.shoes.push(Cat_Shoes);

  //-----------------------------------------------------------------------------------
  // Cat_Helmet
  //
  // armor type: HELMET

  Cat_Helmet = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Helmet.spawnLevel = 4;

  Cat_Helmet.itemName = '貓皮帽';
  Cat_Helmet.itemDescription = '泛著光澤的皮帽';
  Cat_Helmet.material = [{itemClass: Cat_Skin, amount: 4}];

  Cat_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Cat_Helmet.prototype.constructor = Cat_Helmet;

  Cat_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Cat_Helmet.itemName;
    this.description = Cat_Helmet.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 1);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Helmet);
  ItemUtils.EquipTemplates.helmet.push(Cat_Helmet);

  //-----------------------------------------------------------------------------------
  // Cat_Coat
  //
  // armor type: COAT

  Cat_Coat = function() {
    this.initialize.apply(this, arguments);
  }
  Cat_Coat.spawnLevel = 4;

  Cat_Coat.itemName = '貓皮大衣';
  Cat_Coat.itemDescription = '泛著光澤的大衣';
  Cat_Coat.material = [{itemClass: Cat_Skin, amount: 8}];

  Cat_Coat.prototype = Object.create(EquipTemplate.prototype);
  Cat_Coat.prototype.constructor = Cat_Coat;

  Cat_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Cat_Coat.itemName;
    this.description = Cat_Coat.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Coat);
  ItemUtils.EquipTemplates.coat.push(Cat_Coat);

  //-----------------------------------------------------------------------------------
  // Wolf_Gloves
  //
  // armor type: GLOVES

  Wolf_Gloves = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Gloves.spawnLevel = 6;

  Wolf_Gloves.itemName = '狼皮手套';
  Wolf_Gloves.itemDescription = '堅韌的手套';
  Wolf_Gloves.material = [{itemClass: Wolf_Skin, amount: 4}];

  Wolf_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Gloves.prototype.constructor = Wolf_Gloves;

  Wolf_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Wolf_Gloves.itemName;
    this.description = Wolf_Gloves.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Gloves);
  ItemUtils.EquipTemplates.gloves.push(Wolf_Gloves);

  //-----------------------------------------------------------------------------------
  // Wolf_Shoes
  //
  // armor type: SHOES

  Wolf_Shoes = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Shoes.spawnLevel = 6;

  Wolf_Shoes.itemName = '狼皮靴子';
  Wolf_Shoes.itemDescription = '堅韌的靴子';
  Wolf_Shoes.material = [{itemClass: Wolf_Skin, amount: 4}];

  Wolf_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Shoes.prototype.constructor = Wolf_Shoes;

  Wolf_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Wolf_Shoes.itemName;
    this.description = Wolf_Shoes.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Shoes);
  ItemUtils.EquipTemplates.shoes.push(Wolf_Shoes);

  //-----------------------------------------------------------------------------------
  // Wolf_Shield
  //
  // armor type: SHIELD

  Wolf_Shield = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Shield.spawnLevel = 6;

  Wolf_Shield.itemName = '狼皮盾';
  Wolf_Shield.itemDescription = '堅韌的輕盾';
  Wolf_Shield.material = [{itemClass: Wolf_Skin, amount: 2}, {itemClass: Wolf_Bone, amount: 2}];

  Wolf_Shield.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Shield.prototype.constructor = Wolf_Shield;

  Wolf_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Wolf_Shield.itemName;
    this.description = Wolf_Shield.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Shield);
  ItemUtils.EquipTemplates.shield.push(Wolf_Shield);

  //-----------------------------------------------------------------------------------
  // Wolf_Helmet
  //
  // armor type: HELMET

  Wolf_Helmet = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Helmet.spawnLevel = 6;

  Wolf_Helmet.itemName = '狼皮帽';
  Wolf_Helmet.itemDescription = '堅韌的皮帽';
  Wolf_Helmet.material = [{itemClass: Wolf_Skin, amount: 4}];

  Wolf_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Helmet.prototype.constructor = Wolf_Helmet;

  Wolf_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Wolf_Helmet.itemName;
    this.description = Wolf_Helmet.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Helmet);
  ItemUtils.EquipTemplates.helmet.push(Wolf_Helmet);

  //-----------------------------------------------------------------------------------
  // Wolf_Coat
  //
  // armor type: COAT

  Wolf_Coat = function() {
    this.initialize.apply(this, arguments);
  }
  Wolf_Coat.spawnLevel = 6;

  Wolf_Coat.itemName = '狼皮大衣';
  Wolf_Coat.itemDescription = '堅韌的大衣';
  Wolf_Coat.material = [{itemClass: Wolf_Skin, amount: 8}];

  Wolf_Coat.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Coat.prototype.constructor = Wolf_Coat;

  Wolf_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Wolf_Coat.itemName;
    this.description = Wolf_Coat.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 5 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Coat);
  ItemUtils.EquipTemplates.coat.push(Wolf_Coat);

  //-----------------------------------------------------------------------------------
  // Bear_Gloves
  //
  // armor type: GLOVES

  Bear_Gloves = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Gloves.spawnLevel = 6;

  Bear_Gloves.itemName = '熊皮手套';
  Bear_Gloves.itemDescription = '厚實的手套';
  Bear_Gloves.material = [{itemClass: Bear_Skin, amount: 4}];

  Bear_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Bear_Gloves.prototype.constructor = Bear_Gloves;

  Bear_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Bear_Gloves.itemName;
    this.description = Bear_Gloves.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Gloves);
  ItemUtils.EquipTemplates.gloves.push(Bear_Gloves);

  //-----------------------------------------------------------------------------------
  // Bear_Shoes
  //
  // armor type: SHOES

  Bear_Shoes = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Shoes.spawnLevel = 6;

  Bear_Shoes.itemName = '熊皮靴子';
  Bear_Shoes.itemDescription = '厚實的靴子';
  Bear_Shoes.material = [{itemClass: Bear_Skin, amount: 4}];

  Bear_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Bear_Shoes.prototype.constructor = Bear_Shoes;

  Bear_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Bear_Shoes.itemName;
    this.description = Bear_Shoes.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Shoes);
  ItemUtils.EquipTemplates.shoes.push(Bear_Shoes);

  //-----------------------------------------------------------------------------------
  // Bear_Shield
  //
  // armor type: SHIELD

  Bear_Shield = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Shield.spawnLevel = 6;

  Bear_Shield.itemName = '熊皮盾';
  Bear_Shield.itemDescription = '厚實的輕盾';
  Bear_Shield.material = [{itemClass: Bear_Skin, amount: 2}, {itemClass: Bear_Bone, amount: 2}];

  Bear_Shield.prototype = Object.create(EquipTemplate.prototype);
  Bear_Shield.prototype.constructor = Bear_Shield;

  Bear_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Bear_Shield.itemName;
    this.description = Bear_Shield.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 5 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Shield);
  ItemUtils.EquipTemplates.shield.push(Bear_Shield);

  //-----------------------------------------------------------------------------------
  // Bear_Helmet
  //
  // armor type: HELMET

  Bear_Helmet = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Helmet.spawnLevel = 6;

  Bear_Helmet.itemName = '熊皮帽';
  Bear_Helmet.itemDescription = '厚實的皮帽';
  Bear_Helmet.material = [{itemClass: Bear_Skin, amount: 4}];

  Bear_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Bear_Helmet.prototype.constructor = Bear_Helmet;

  Bear_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Bear_Helmet.itemName;
    this.description = Bear_Helmet.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Helmet);
  ItemUtils.EquipTemplates.helmet.push(Bear_Helmet);

  //-----------------------------------------------------------------------------------
  // Bear_Coat
  //
  // armor type: COAT

  Bear_Coat = function() {
    this.initialize.apply(this, arguments);
  }
  Bear_Coat.spawnLevel = 6;

  Bear_Coat.itemName = '熊皮大衣';
  Bear_Coat.itemDescription = '厚實的大衣';
  Bear_Coat.material = [{itemClass: Bear_Skin, amount: 8}];

  Bear_Coat.prototype = Object.create(EquipTemplate.prototype);
  Bear_Coat.prototype.constructor = Bear_Coat;

  Bear_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Bear_Coat.itemName;
    this.description = Bear_Coat.itemDescription;
    this.templateName = this.name;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 6 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Coat);
  ItemUtils.EquipTemplates.coat.push(Bear_Coat);

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
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 0;
    this.name = '治療藥水';
    this.description = '回復些許生命力';
  }

  Potion_Heal.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let value = 50;
    realUser.setHp(realUser._hp + value);
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 45));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', value));
      let msg = String.format(Message.display('quaffPotionHeal'), LogUtils.getCharName(realUser)
        , value);
      LogUtils.addLog(msg);
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Mana
  //
  // potion id 1

  Potion_Mana = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Mana.prototype = Object.create(ItemTemplate.prototype);
  Potion_Mana.prototype.constructor = Potion_Mana;

  Potion_Mana.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 1;
    this.name = '魔力藥水';
    this.description = '回復些許魔力';
  }

  Potion_Mana.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let value = 20;
    realUser.setMp(realUser._mp + value);
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 45));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', value));
      let msg = String.format(Message.display('quaffPotionMana'), LogUtils.getCharName(realUser)
        , value);
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Blind
  //
  // potion id 2

  Potion_Blind = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Blind.prototype = Object.create(ItemTemplate.prototype);
  Potion_Blind.prototype.constructor = Potion_Blind;

  Potion_Blind.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 2;
    this.name = '失明藥水';
    this.description = '暫時喪失視力';
  }

  Potion_Blind.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.blindCount = 20;
    if (user == $gamePlayer) {
      $gameActors.actor(1).awareDistance = 0;
    }
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 60));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '失明'));
      let msg = String.format(Message.display('blind'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Paralyze
  //
  // potion id 3

  Potion_Paralyze = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Paralyze.prototype = Object.create(ItemTemplate.prototype);
  Potion_Paralyze.prototype.constructor = Potion_Paralyze;

  Potion_Paralyze.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 3;
    this.name = '麻痺藥水';
    this.description = '暫時麻痺無法行動';
  }

  Potion_Paralyze.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.paralyzeCount = 5;
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 64));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '麻痺'));
      let msg = String.format(Message.display('paralyze'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Sleep
  //
  // potion id 4

  Potion_Sleep = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Sleep.prototype = Object.create(ItemTemplate.prototype);
  Potion_Sleep.prototype.constructor = Potion_Sleep;

  Potion_Sleep.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 4;
    this.name = '催眠藥水';
    this.description = '陷入沉睡';
  }

  Potion_Sleep.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.sleepCount = 20;
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 62));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '睡眠'));
      let msg = String.format(Message.display('sleep'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Speed
  //
  // potion id 5

  Potion_Speed = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Speed.prototype = Object.create(ItemTemplate.prototype);
  Potion_Speed.prototype.constructor = Potion_Speed;

  Potion_Speed.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 5;
    this.name = '加速藥水';
    this.description = '暫時提升行動速度';
  }

  Potion_Speed.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.speedUpCount = 20;
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '加速'));
      let msg = String.format(Message.display('speedUp'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Growth
  //
  // potion id 6

  Potion_Growth = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Growth.prototype = Object.create(ItemTemplate.prototype);
  Potion_Growth.prototype.constructor = Potion_Growth;

  Potion_Growth.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 6;
    this.name = '成長藥水';
    this.description = '能力值增長';
  }

  Potion_Growth.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let index = getRandomIntRange(2, 8);
    realUser._paramPlus[index]++;
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 49));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '能力提昇'));
      let msg = String.format(Message.display('growth'), LogUtils.getCharName(realUser)
        , ItemUtils.getAttributeName(index));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_LevelUp
  //
  // potion id 7

  Potion_LevelUp = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_LevelUp.prototype = Object.create(ItemTemplate.prototype);
  Potion_LevelUp.prototype.constructor = Potion_LevelUp;

  Potion_LevelUp.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 7;
    this.name = '升級藥水';
    this.description = '提升等級';
  }

  Potion_LevelUp.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 46));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '升級'));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      if (user != $gamePlayer) {
        let msg = String.format(Message.display('levelUp'), LogUtils.getCharName(realUser));
        LogUtils.addLog(msg);
      }
    }
    if (user == $gamePlayer) {
      realUser.levelUp();
    } else {
      CharUtils.levelUp(realUser);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Invisible
  //
  // potion id 8

  Potion_Invisible = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Invisible.prototype = Object.create(ItemTemplate.prototype);
  Potion_Invisible.prototype.constructor = Potion_Invisible;

  Potion_Invisible.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 8;
    this.name = '隱形藥水';
    this.description = '暫時隱形';
  }

  Potion_Invisible.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.invisibleCount = 20;
    if (user == $gamePlayer) {
      $gamePlayer.setOpacity(64);
    }
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 35));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '隱形'));
      let msg = String.format(Message.display('invisible'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_SeeInvisible
  //
  // potion id 9

  Potion_SeeInvisible = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_SeeInvisible.prototype = Object.create(ItemTemplate.prototype);
  Potion_SeeInvisible.prototype.constructor = Potion_SeeInvisible;

  Potion_SeeInvisible.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 9;
    this.name = '偵測隱形藥水';
    this.description = '暫時可看見隱形的生物';
  }

  Potion_SeeInvisible.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.seeInvisibleCount = 40;
    if (CharUtils.playerCanSeeChar(user)) {
      AudioManager.playSe({name: "Ice4", pan: 0, pitch: 100, volume: 100});
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '偵測隱形'));
      let msg = String.format(Message.display('seeInvisible'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Potion_Acid
  //
  // potion id 10

  Potion_Acid = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Acid.prototype = Object.create(ItemTemplate.prototype);
  Potion_Acid.prototype.constructor = Potion_Acid;

  Potion_Acid.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 10;
    this.name = '酸蝕藥水';
    this.description = '造成酸蝕傷害';
  }

  Potion_Acid.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let damage = 30;
    CharUtils.decreaseHp(realUser, damage);
    let msg = String.format(Message.display('acidDamage'), LogUtils.getCharName(realUser), damage);
    // TODO: damage armor/weapon
    if (user == $gamePlayer) {
      let equips = realUser.equips().filter(function(item) {
        return item != null;
      })
      if (equips.length > 0) {
        let toDamage = equips[getRandomInt(equips.length)];
        LogUtils.addLog(String.format(Message.display('equipAcidDamage')
          , LogUtils.getCharName(realUser), toDamage.name));
        ItemUtils.enchantEquip(toDamage, -1);
      }
    }

    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 39));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '酸蝕'));
      LogUtils.addLog(msg);
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
    }
    BattleUtils.checkTargetAlive(null, realUser, user);
  }

  //-----------------------------------------------------------------------------------
  // Potion_Poison
  //
  // potion id 11

  Potion_Poison = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Poison.prototype = Object.create(ItemTemplate.prototype);
  Potion_Poison.prototype.constructor = Potion_Poison;

  Potion_Poison.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 11;
    this.name = '毒藥水';
    this.description = '中毒';
  }

  Potion_Poison.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.poisonCount = 10;
    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 59));
      TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '中毒'));
      let msg = String.format(Message.display('poison'), LogUtils.getCharName(realUser));
      if (identifyObject) {
        ItemUtils.identifyObject(this);
      }
      LogUtils.addLog(msg);
    }
  }

  // store all potion templates
  // harmful potions
  ItemUtils.potionTemplates[0] = Potion_Blind;
  ItemUtils.potionTemplates[1] = Potion_Paralyze;
  ItemUtils.potionTemplates[2] = Potion_Sleep;
  ItemUtils.potionTemplates[3] = Potion_Acid;
  ItemUtils.potionTemplates[4] = Potion_Poison;
  // non-harmful potions
  ItemUtils.potionTemplates[5] = Potion_Heal;
  ItemUtils.potionTemplates[6] = Potion_Mana;
  ItemUtils.potionTemplates[7] = Potion_Speed;
  ItemUtils.potionTemplates[8] = Potion_Growth;
  ItemUtils.potionTemplates[9] = Potion_LevelUp;
  ItemUtils.potionTemplates[10] = Potion_Invisible;
  ItemUtils.potionTemplates[11] = Potion_SeeInvisible;

  //-----------------------------------------------------------------------------------
  // Scroll_Identify
  //
  // scroll id 0

  Scroll_Identify = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_Identify.prototype = Object.create(ItemTemplate.prototype);
  Scroll_Identify.prototype.constructor = Scroll_Identify;

  Scroll_Identify.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 0;
    this.name = '鑑定卷軸';
    this.description = '鑑定身上的一件物品';
  }

  Scroll_Identify.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let items = $gameParty.allItems().filter(function(item){
        return !ItemUtils.checkItemIdentified(item) && item.name != '鑑定卷軸';
      });
      let msg;
      if (items.length > 0) {
        let toIdentify = items[getRandomInt(items.length)];
        let unknownName = ItemUtils.getItemDisplayName(toIdentify);
        ItemUtils.identifyObject(toIdentify);
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
        msg = String.format(Message.display('scrollIdentifyRead'), unknownName, toIdentify.name);
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_EnchantArmor
  //
  // scroll id 1

  Scroll_EnchantArmor = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_EnchantArmor.prototype = Object.create(ItemTemplate.prototype);
  Scroll_EnchantArmor.prototype.constructor = Scroll_EnchantArmor;

  Scroll_EnchantArmor.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 1;
    this.name = '防具強化卷軸';
    this.description = '強化一件裝備中的防具';
  }

  Scroll_EnchantArmor.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let equips = $gameActors.actor(1).equips().filter(function(item) {
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
          for (let id in $gameActors.actor(1)._equips) {
            if ($gameActors.actor(1)._equips[id]._item == equip) {
              $gameActors.actor(1)._equips[id] = new Game_Item();
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
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_EnchantWeapon
  //
  // scroll id 2

  Scroll_EnchantWeapon = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_EnchantWeapon.prototype = Object.create(ItemTemplate.prototype);
  Scroll_EnchantWeapon.prototype.constructor = Scroll_EnchantWeapon;

  Scroll_EnchantWeapon.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 2;
    this.name = '武器強化卷軸';
    this.description = '強化裝備中的武器';
  }

  Scroll_EnchantWeapon.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let equips = $gameActors.actor(1).equips().filter(function(item) {
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
          for (let id in $gameActors.actor(1)._equips) {
            if ($gameActors.actor(1)._equips[id]._item == equip) {
              $gameActors.actor(1)._equips[id] = new Game_Item();
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
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_RemoveCurse
  //
  // scroll id 3

  Scroll_RemoveCurse = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_RemoveCurse.prototype = Object.create(ItemTemplate.prototype);
  Scroll_RemoveCurse.prototype.constructor = Scroll_RemoveCurse;

  Scroll_RemoveCurse.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 3;
    this.name = '解除詛咒卷軸';
    this.description = '解除一件裝備中的詛咒';
  }

  Scroll_RemoveCurse.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let equips = $gameActors.actor(1).equips().filter(function(item) {
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
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_Teleport
  //
  // scroll id 4

  Scroll_Teleport = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_Teleport.prototype = Object.create(ItemTemplate.prototype);
  Scroll_Teleport.prototype.constructor = Scroll_Teleport;

  Scroll_Teleport.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 4;
    this.name = '傳送卷軸';
    this.description = '傳送至地圖的某處';
  }

  Scroll_Teleport.prototype.onRead = function(user, identifyObject) {
    let floors = MapUtils.findMapDataFloor($gameVariables[$gameMap._mapId].mapData);
    let floor = null;
    while (true) {
      floor = floors[Math.randomInt(floors.length)];
      if (MapUtils.isTileAvailableForMob($gameMap._mapId, floor.x, floor.y) && (floor.x != user._x && floor.y != user._y)) {
        break;
      }
    }
    let realUser = BattleUtils.getRealTarget(user);
    // disappear
    if (user != $gamePlayer && CharUtils.playerCanSeeChar(user)) {
      LogUtils.addLog(String.format(Message.display('seeTeleportAway'), LogUtils.getCharName(realUser)));
    }
    if ($gameVariables[$gameMap._mapId].mapData[user._x][user._y].isVisible) {
      AudioManager.playSe({name: "Run", pan: 0, pitch: 100, volume: 100});
    }

    user.setPosition(floor.x, floor.y);
    if (user == $gamePlayer) {
      $gamePlayer.center(floor.x, floor.y);
      LogUtils.addLog(Message.display('scrollTeleportRead'));
    }
    MapUtils.refreshMap();

    // appear
    if (user != $gamePlayer && CharUtils.playerCanSeeChar(user)) {
      LogUtils.addLog(String.format(Message.display('seeTeleportAppear'), LogUtils.getCharName(realUser)));
    }
    if (identifyObject) {
      ItemUtils.identifyObject(this);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_DestroyArmor
  //
  // scroll id 5

  Scroll_DestroyArmor = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_DestroyArmor.prototype = Object.create(ItemTemplate.prototype);
  Scroll_DestroyArmor.prototype.constructor = Scroll_DestroyArmor;

  Scroll_DestroyArmor.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 5;
    this.name = '摧毀防具卷軸';
    this.description = '摧毀一件裝備中的防具';
  }

  Scroll_DestroyArmor.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let equips = $gameActors.actor(1).equips().filter(function(item) {
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
        for (let id in $gameActors.actor(1)._equips) {
          if ($gameActors.actor(1)._equips[id]._item == equip) {
            $gameActors.actor(1)._equips[id] = new Game_Item();
            break;
          }
        }
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_CreateMonster
  //
  // scroll id 6

  Scroll_CreateMonster = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_CreateMonster.prototype = Object.create(ItemTemplate.prototype);
  Scroll_CreateMonster.prototype.constructor = Scroll_CreateMonster;

  Scroll_CreateMonster.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 6;
    this.name = '召喚生物卷軸';
    this.description = '在身邊召喚怪物';
  }

  Scroll_CreateMonster.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
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
        new Chick(targetFloor.x, targetFloor.y);
        MapUtils.refreshMap();
        msg = Message.display('scrollCreateMonsterRead');
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
      }
      MapUtils.addBothLog(msg);
    }
  }

  //-----------------------------------------------------------------------------------
  // Scroll_ScareMonster
  //
  // scroll id 7

  Scroll_ScareMonster = function() {
    this.initialize.apply(this, arguments);
  }

  Scroll_ScareMonster.prototype = Object.create(ItemTemplate.prototype);
  Scroll_ScareMonster.prototype.constructor = Scroll_ScareMonster;

  Scroll_ScareMonster.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[7]);
    this.id = 7;
    this.name = '威嚇卷軸';
    this.description = '一段時間內嚇退敵人';
  }

  Scroll_ScareMonster.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let msg = Message.display('scrollScareMonsterRead');
      LogUtils.addLog(msg);
      let seeMonsterScared = false;
      for (let id in $gameMap._events) {
        let evt = $gameMap._events[id];
        if (evt && evt.type == 'MOB' && MapUtils.getDistance(evt._x, evt._y, $gamePlayer._x, $gamePlayer._y) <= 10) {
          evt.mob.status.afraidCount = 20;
          if ($gameVariables[$gameMap._mapId].mapData[evt._x][evt._y].isVisible) {
            LogUtils.addLog(String.format(Message.display('monsterFlee'), evt.mob.name()));
            seeMonsterScared = true;
          }
        }
      }
      if (seeMonsterScared) {
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      }
      MapUtils.displayMessage(msg);
    }
  }

  ItemUtils.scrollTemplates[0] = Scroll_Identify;
  ItemUtils.scrollTemplates[1] = Scroll_EnchantArmor;
  ItemUtils.scrollTemplates[2] = Scroll_EnchantWeapon;
  ItemUtils.scrollTemplates[3] = Scroll_RemoveCurse;
  ItemUtils.scrollTemplates[4] = Scroll_Teleport;
  ItemUtils.scrollTemplates[5] = Scroll_DestroyArmor;
  ItemUtils.scrollTemplates[6] = Scroll_CreateMonster;
  ItemUtils.scrollTemplates[7] = Scroll_ScareMonster;

  //-----------------------------------------------------------------------------------
  // Soul_Chick

  Soul_Chick = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Chick.prototype = Object.create(ItemTemplate.prototype);
  Soul_Chick.prototype.constructor = Soul_Chick;

  Soul_Chick.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '雛鳥之魂';
    this.description = '你感受到了雛鳥那份奮鬥不懈的心!';
  }

  // only used by player
  Soul_Chick.expAfterAmplify = function(value) {
    return ($gameParty.hasSoul(Soul_Chick) ? value * 1.05 : value);
  }

  //-----------------------------------------------------------------------------------
  // Soul_Bite

  Soul_Bite = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Bite.prototype = Object.create(ItemTemplate.prototype);
  Soul_Bite.prototype.constructor = Soul_Bite;

  Soul_Bite.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '噬咬';
    this.description = '你的牙齒變得更銳利了';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Hide

  Soul_Hide = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Hide.prototype = Object.create(ItemTemplate.prototype);
  Soul_Hide.prototype.constructor = Soul_Hide;

  Soul_Hide.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '隱匿';
    this.description = '你學會隱藏自己的身影';
  }

  //-----------------------------------------------------------------------------------
  // Soul_EatRot

  Soul_EatRot = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_EatRot.prototype = Object.create(ItemTemplate.prototype);
  Soul_EatRot.prototype.constructor = Soul_EatRot;

  Soul_EatRot.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '食腐';
    this.description = '你的胃能安全消化腐爛的食物';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Clever

  Soul_Clever = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Clever.prototype = Object.create(ItemTemplate.prototype);
  Soul_Clever.prototype.constructor = Soul_Clever;

  Soul_Clever.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '狡詐';
    this.description = '你學會了勾心鬥角';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Scud

  Soul_Scud = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Scud.prototype = Object.create(ItemTemplate.prototype);
  Soul_Scud.prototype.constructor = Soul_Scud;

  Soul_Scud.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '俊足';
    this.description = '你的雙腿變得強壯';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Charge

  Soul_Charge = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Charge.prototype = Object.create(ItemTemplate.prototype);
  Soul_Charge.prototype.constructor = Soul_Charge;

  Soul_Charge.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '衝撞';
    this.description = '你的身軀充滿了爆發力';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Bash

  Soul_Bash = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Bash.prototype = Object.create(ItemTemplate.prototype);
  Soul_Bash.prototype.constructor = Soul_Bash;

  Soul_Bash.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '猛擊';
    this.description = '你的雙手充滿了力量';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Pierce

  Soul_Pierce = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Pierce.prototype = Object.create(ItemTemplate.prototype);
  Soul_Pierce.prototype.constructor = Soul_Pierce;

  Soul_Pierce.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '穿刺';
    this.description = '你學會如何貫穿弱點';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Shield

  Soul_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Shield.prototype = Object.create(ItemTemplate.prototype);
  Soul_Shield.prototype.constructor = Soul_Shield;

  Soul_Shield.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '鐵壁';
    this.description = '你的皮膚變得堅硬';
  }

  //-----------------------------------------------------------------------------------
  // SkillUtils
  //
  // Skill related methods

  SkillUtils = function() {
    throw new Error('This is a static class');
  }

  SkillUtils.skillList = []; // save all skills

  SkillUtils.meleeDamage = function(realSrc, realTarget, skillAmplify) {
    // get weapon bonus
    let weaponSkill = BattleUtils.getWeaponSkill(realSrc);
    let weaponBonus = 0;
    if (weaponSkill) {
      let prop = window[weaponSkill.constructor.name].prop;
      weaponBonus = prop.effect[weaponSkill.lv].atk;
    }
    return BattleUtils.calcPhysicalDamage(realSrc, realTarget, weaponBonus, skillAmplify);
  }

  SkillUtils.canPerform = function(realSrc, skill) {
    if (realSrc._tp < skill.tpCost) {
      if (realSrc == $gameActors.actor(1)) {
        setTimeout(function() {
          MapUtils.displayMessage(Message.display('noEnergy'));
        }, 100);
      }
      return false;
    } else if (realSrc._mp < skill.mpCost) {
      if (realSrc == $gameActors.actor(1)) {
        setTimeout(function() {
          MapUtils.displayMessage(Message.display('noMana'));
        }, 100);
      }
      return false;
    }
    return true;
  }

  SkillUtils.gainSkillExp = function(realSrc, skill, index, prop) {
    if (realSrc == $gameActors.actor(1)) {
      skill.exp += Soul_Chick.expAfterAmplify(1);
      if (prop.effect[index].levelUp != -1 && skill.exp >= prop.effect[index].levelUp) {
        let msg = String.format(Message.display('skillLevelUp'), skill.name)
        $gameMessage.add(msg);
        LogUtils.addLog(msg);
        skill.lv++;
        skill.exp = 0;
      }
    }
  }

  // for directional skill
  SkillUtils.performDirectionalAction = function(src, x, y) {
    let target = null;
    let events = $gameMap.eventsXy(x, y);
    for (let id in events) {
      if (events[id].mob) {
        target = events[id];
      }
    }
    if ($gamePlayer.pos(x, y)) {
      target = $gamePlayer;
    }

    if (src == $gamePlayer && target) {
      switch ($gameVariables[0].fireProjectileInfo.skill.stypeId) {
        case 1: // magic
          CharUtils.playerGainIntExp(1);
          break;
        case 2: // war skill
          CharUtils.playerGainStrExp(1);
          break;
      }
    }
    $gameVariables[0].fireProjectileInfo.skill.action(src, target);
    $gameVariables[0].messageFlag = false;
    $gameActors.actor(1).attacked = true;
    return true;
  }

  // for projectile skill
  SkillUtils.performProjectileAction = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.attacked = $gameVariables[0].fireProjectileInfo.skill.action(src, x, y);
    return realSrc.attacked;
  }

  SkillUtils.performSkill = function(skill) {
    if (!SkillUtils.canPerform($gameActors.actor(1), skill)) {
      return;
    }
    let prop = window[skill.constructor.name].prop;
    if (prop.subType == 'DIRECTIONAL') {
      $gameVariables[0].fireProjectileInfo.skill = skill;
      $gameVariables[0].directionalAction = SkillUtils.performDirectionalAction;
      $gameVariables[0].directionalFlag = true;
      setTimeout(function() {
        MapUtils.displayMessage(Message.display('askDirection'));
      }, 100);
    } else if (prop.subType == 'PROJECTILE') {
      $gameVariables[0].fireProjectileInfo.skill = skill;
      $gameVariables[0].directionalAction = SkillUtils.performProjectileAction;
      $gameVariables[0].directionalFlag = true;
      setTimeout(function() {
        MapUtils.displayMessage(Message.display('askDirection'));
      }, 100);
    } else if (prop.subType == 'RANGE') {
      skill.action($gamePlayer);
      $gameActors.actor(1).attacked = true;
      switch (skill.stypeId) {
        case 1: // magic
          CharUtils.playerGainIntExp(1);
          break;
        case 2: // war skill
          CharUtils.playerGainStrExp(1);
          break;
      }
      setTimeout('TimeUtils.afterPlayerMoved();', 100);
    }
  }

  SkillUtils.getHotKey = function(skill) {
    for (let i = 0; i < 10; i++) {
      if ($gameVariables[0].hotkeys[i] == skill) {
        return i;
      }
    }
    return null;
  }

  SkillUtils.getSkillInstance = function(realTarget, skillClass) {
    for (let id in realTarget._skills) {
      if (realTarget._skills[id].constructor.name == skillClass.name) {
        return realTarget._skills[id];
      }
    }
    return null;
  }

  //-----------------------------------------------------------------------------------
  // Skill_MartialArt

  Skill_MartialArt = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_MartialArt.prototype = Object.create(ItemTemplate.prototype);
  Skill_MartialArt.prototype.constructor = Skill_MartialArt;

  Skill_MartialArt.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '武術';
    this.description = '赤手空拳搏鬥的技術';
    this.iconIndex = 77;
    this.lv = 0;
    this.exp = 0;
  }

  Skill_MartialArt.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 0, atk: 0, levelUp: 20},
      {lv: 1, atk: 2, levelUp: 20},
      {lv: 2, atk: 5, levelUp: 40},
      {lv: 3, atk: 8, levelUp: 60},
      {lv: 4, atk: 10, levelUp: 80},
      {lv: 5, atk: 12, levelUp: 100},
      {lv: 6, atk: 15, levelUp: 150},
      {lv: 7, atk: 20, levelUp: 300},
      {lv: 8, atk: 28, levelUp: 450},
      {lv: 9, atk: 35, levelUp: 500},
      {lv: 10, atk: 40, levelUp: -1}
    ]
  }

  //-----------------------------------------------------------------------------------
  // Skill_Throwing

  Skill_Throwing = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Throwing.prototype = Object.create(ItemTemplate.prototype);
  Skill_Throwing.prototype.constructor = Skill_Throwing;

  Skill_Throwing.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '投擲';
    this.description = '投擲物品的技術';
    this.iconIndex = 78;
    this.lv = 0;
    this.exp = 0;
  }

  Skill_Throwing.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 0, atk: 0, levelUp: 20},
      {lv: 1, atk: 2, levelUp: 20},
      {lv: 2, atk: 5, levelUp: 40},
      {lv: 3, atk: 8, levelUp: 60},
      {lv: 4, atk: 10, levelUp: 80},
      {lv: 5, atk: 12, levelUp: 100},
      {lv: 6, atk: 15, levelUp: 150},
      {lv: 7, atk: 20, levelUp: 300},
      {lv: 8, atk: 28, levelUp: 450},
      {lv: 9, atk: 35, levelUp: 500},
      {lv: 10, atk: 40, levelUp: -1}
    ]
  }

  //-----------------------------------------------------------------------------------
  // Skill_Chick

  Skill_Chick = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Chick.prototype = Object.create(ItemTemplate.prototype);
  Skill_Chick.prototype.constructor = Skill_Chick;

  Skill_Chick.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '雛鳥之魂';
    this.description = '獲得經驗值+5%';
    this.iconIndex = 77;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Chick.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 1, levelUp: -1}
    ]
  }

  //-----------------------------------------------------------------------------------
  // Skill_Bite

  Skill_Bite = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Bite.prototype = Object.create(ItemTemplate.prototype);
  Skill_Bite.prototype.constructor = Skill_Bite;

  Skill_Bite.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '噬咬';
    this.description = '噬咬一名敵人, 機率出血';
    this.iconIndex = 5;
    this.mpCost = 2;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Bite.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE",
    effect: [
      {lv: 1, baseDamage: 10, bleedPercentage: 0.1, maxBleedTurn: 3, levelUp: 50},
      {lv: 2, baseDamage: 12, bleedPercentage: 0.2, maxBleedTurn: 5, levelUp: 150},
      {lv: 3, baseDamage: 14, bleedPercentage: 0.3, maxBleedTurn: 7, levelUp: 300},
      {lv: 4, baseDamage: 16, bleedPercentage: 0.4, maxBleedTurn: 9, levelUp: 450},
      {lv: 5, baseDamage: 18, bleedPercentage: 0.5, maxBleedTurn: 11, levelUp: -1}
    ]
  }

  Skill_Bite.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let prop = Skill_Bite.prop;
      let index = this.lv - 1;
      let value = prop.effect[index].baseDamage + Math.floor(realSrc.param(2) / 3)
        - realTarget.param(8);
      value = BattleUtils.getFinalDamage(value);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 12));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes bleeding
      if (Math.random() < prop.effect[index].bleedPercentage) {
        realTarget.status.bleedingCount += dice(1, prop.effect[index].maxBleedTurn);
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '出血'));
        LogUtils.addLog(String.format(Message.display('bleeding'), LogUtils.getCharName(realTarget)));
      }
      SkillUtils.gainSkillExp(realSrc, this, index, prop);
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    } else {
      LogUtils.addLog(String.format(Message.display('attackAir'), LogUtils.getCharName(realSrc)
        , this.name));
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Bash

  Skill_Bash = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Bash.prototype = Object.create(ItemTemplate.prototype);
  Skill_Bash.prototype.constructor = Skill_Bash;

  Skill_Bash.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '猛擊';
    this.description = '猛擊一名敵人, 機率昏迷';
    this.iconIndex = 5;
    this.mpCost = 2;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Bash.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE",
    effect: [
      {lv: 1, baseDamage: 10, faintPercentage: 0.1, faintTurnMax: 2, levelUp: 50},
      {lv: 2, baseDamage: 12, faintPercentage: 0.2, faintTurnMax: 3, levelUp: 150},
      {lv: 3, baseDamage: 14, faintPercentage: 0.3, faintTurnMax: 4, levelUp: 300},
      {lv: 4, baseDamage: 16, faintPercentage: 0.4, faintTurnMax: 5, levelUp: 450},
      {lv: 5, baseDamage: 18, faintPercentage: 0.5, faintTurnMax: 6, levelUp: -1}
    ]
  }

  Skill_Bash.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let prop = Skill_Bash.prop;
      let index = this.lv - 1;
      let value = prop.effect[index].baseDamage + Math.floor(realSrc.param(2) / 3)
        - realTarget.param(8);
      value = BattleUtils.getFinalDamage(value);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 1));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes faint
      if (Math.random() < prop.effect[index].faintPercentage) {
        realTarget.status.faintCount += dice(1, prop.effect[index].faintTurnMax);
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '昏迷'));
        LogUtils.addLog(String.format(Message.display('faint'), LogUtils.getCharName(realTarget)));
      }
      SkillUtils.gainSkillExp(realSrc, this, index, prop);
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    } else {
      LogUtils.addLog(String.format(Message.display('attackAir'), LogUtils.getCharName(realSrc)
        , this.name));
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Pierce

  Skill_Pierce = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Pierce.prototype = Object.create(ItemTemplate.prototype);
  Skill_Pierce.prototype.constructor = Skill_Pierce;

  Skill_Pierce.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '穿刺';
    this.description = '穿刺一名敵人, 機率破甲';
    this.iconIndex = 5;
    this.mpCost = 2;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Pierce.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE",
    effect: [
      {lv: 1, baseDamage: 10, breakArmorPercentage: 0.1, breakArmorTurnMax: 5, levelUp: 50},
      {lv: 2, baseDamage: 12, breakArmorPercentage: 0.2, breakArmorTurnMax: 7, levelUp: 150},
      {lv: 3, baseDamage: 14, breakArmorPercentage: 0.3, breakArmorTurnMax: 9, levelUp: 300},
      {lv: 4, baseDamage: 16, breakArmorPercentage: 0.4, breakArmorTurnMax: 11, levelUp: 450},
      {lv: 5, baseDamage: 18, breakArmorPercentage: 0.5, breakArmorTurnMax: 13, levelUp: -1}
    ]
  }

  Skill_Pierce.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let prop = Skill_Pierce.prop;
      let index = this.lv - 1;
      let value = prop.effect[index].baseDamage + Math.floor(realSrc.param(2) / 3)
        - realTarget.param(8);
      value = BattleUtils.getFinalDamage(value);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 11));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes break armor
      if (Math.random() < prop.effect[index].breakArmorPercentage) {
        realTarget.status.breakArmorCount += dice(1, prop.effect[index].breakArmorTurnMax);
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '破甲'));
        LogUtils.addLog(String.format(Message.display('breakArmor'), LogUtils.getCharName(realTarget)));
      }
      SkillUtils.gainSkillExp(realSrc, this, index, prop);
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    } else {
      LogUtils.addLog(String.format(Message.display('attackAir'), LogUtils.getCharName(realSrc)
        , this.name));
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Charge

  Skill_Charge = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Charge.prototype = Object.create(ItemTemplate.prototype);
  Skill_Charge.prototype.constructor = Skill_Charge;

  Skill_Charge.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '衝鋒';
    this.description = '向一名敵人發起衝鋒, 機率擊退';
    this.iconIndex = 5;
    this.mpCost = 5;
    this.tpCost = 40;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Charge.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MELEE",
    effect: [
      {lv: 1, baseDamage: 10, knockBackPercentage: 0.1, levelUp: 50},
      {lv: 2, baseDamage: 12, knockBackPercentage: 0.2, levelUp: 150},
      {lv: 3, baseDamage: 14, knockBackPercentage: 0.3, levelUp: 300},
      {lv: 4, baseDamage: 16, knockBackPercentage: 0.4, levelUp: 450},
      {lv: 5, baseDamage: 18, knockBackPercentage: 0.5, levelUp: -1}
    ]
  }

  Skill_Charge.data = {
    src: null, // should be a Game_BattlerBase
    skill: null,
    directionX: 0,
    directionY: 0,
    nowDistance: 0,
    maxDistance: 3,
    moveData: null
  }

  Skill_Charge.prototype.action = function(src, x, y) {
    if (src._x == x && src._y == y) {
      MapUtils.displayMessage('你不能向原地發起衝鋒.');
      return false;
    }
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    let moveData = MapUtils.getDisplacementData(src._x, src._y, x, y);
    src.setDirection(moveData.param1);
    AudioManager.playSe({name: "Evasion1", pan: 0, pitch: 100, volume: 100});
    // initialize params
    Skill_Charge.data.moveData = moveData;
    Skill_Charge.data.skill = this;
    if (x == src._x) {
      Skill_Charge.data.directionX = 0;
    } else if (x > src._x) {
      Skill_Charge.data.directionX = 1;
    } else {
      Skill_Charge.data.directionX = -1;
    }

    if (y == src._y) {
      Skill_Charge.data.directionY = 0;
    } else if (y > src._y) {
      Skill_Charge.data.directionY = 1;
    } else {
      Skill_Charge.data.directionY = -1;
    }
    Skill_Charge.data.nowDistance = 0;

    TimeUtils.actionDone = false;
    let func = function() {
      let data = Skill_Charge.data;
      if (data.nowDistance < data.maxDistance) {
        if ((data.moveData.moveFunc == 'moveStraight' && src.canPass(src._x, src._y, data.moveData.param1))
          || (data.moveData.moveFunc == 'moveDiagonally'
          && src.canPassDiagonally(src._x, src._y, data.moveData.param1, data.moveData.param2))) {
          // can pass
          src.setPosition(src._x + data.directionX, src._y + data.directionY);
          data.nowDistance++;
        } else {
          console.log('run into obstacle!');
          // check if bump into wall
          if ($gameVariables[$gameMap._mapId]
            .mapData[src._x + data.directionX][src._y + data.directionY].originalTile == WALL) {
            let value = dice(1, 10);
            TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 2));
            TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', value * -1));
            LogUtils.addLog(String.format(Message.display('bumpIntoWall'), LogUtils.getCharName(realSrc), value));
            CharUtils.decreaseHp(realSrc, value);
            BattleUtils.checkTargetAlive(realSrc, realSrc, src);
            data.nowDistance = 100;
          }
          // check if bump into target
          let evts = $gameMap.eventsXy(src._x + data.directionX, src._y + data.directionY);
          let target;
          for (let id in evts) {
            if (evts[id].type == 'MOB') {
              target = evts[id];
            }
          }
          if ($gamePlayer.pos(src._x + data.directionX, src._y + data.directionY)) {
            target = $gamePlayer;
          }
          if (target) {
            let realTarget = BattleUtils.getRealTarget(target);
            let prop = Skill_Charge.prop;
            let index = data.skill.lv - 1;
            let value = prop.effect[index].baseDamage + Math.floor(realSrc.param(2) / 3)
              - realTarget.param(8);
            value = BattleUtils.getFinalDamage(value);
            TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 2));
            TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
            LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
              , LogUtils.getPerformedTargetName(realSrc, realTarget), data.skill.name, value));
            CharUtils.decreaseHp(realTarget, value);
            // check if causes knock back
            if (Math.random() < prop.effect[index].knockBackPercentage) {
              // check if target able to be knocked back
              if ((data.moveData.moveFunc == 'moveStraight' && target.canPass(target._x, target._y, data.moveData.param1))
                || (data.moveData.moveFunc == 'moveDiagonally'
                && target.canPassDiagonally(target._x, target._y, data.moveData.param1, data.moveData.param2))) {
                TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '擊退'));
                target.setPosition(target._x + data.directionX, target._y + data.directionY);
                LogUtils.addLog(String.format(Message.display('bumpKnockBack'), LogUtils.getCharName(realTarget)));
              } else {
                TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '昏迷'));
                realTarget.status.faintCount++;
                LogUtils.addLog(String.format(Message.display('bumpKnockFaint'), LogUtils.getCharName(realTarget)));
              }
            }
            SkillUtils.gainSkillExp(realSrc, data.skill, index, prop);
            BattleUtils.checkTargetAlive(realSrc, realTarget, target);
            data.nowDistance = 100;
          } else {
            // check if bump into a closed door
            for (let id in evts) {
              let target = evts[id];
              if (target.type == 'DOOR' && target.status == 1) {
                // bump into a closed door
                TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 2));
                $gameSelfSwitches.setValue([$gameMap.mapId(), target._eventId, 'A'], true);
                LogUtils.addLog(String.format(Message.display('bumpIntoDoor'), LogUtils.getCharName(realSrc)));
                target.status = 2;
                data.nowDistance++;
              }
            }
          }
        }
        setTimeout(func, 50);
      } else {
        TimeUtils.actionDone = true;
      }
    }
    func();
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Clever

  Skill_Clever = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Clever.prototype = Object.create(ItemTemplate.prototype);
  Skill_Clever.prototype.constructor = Skill_Clever;

  Skill_Clever.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '狡詐';
    this.description = '暫時智力提升';
    this.iconIndex = 79;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Clever.prop = {
    type: "SKILL",
    subType: "RANGE",
    effect: [
      {lv: 1, buffPercentage: 0.1, turns: 20, levelUp: 50},
      {lv: 2, buffPercentage: 0.2, turns: 30,levelUp: 150},
      {lv: 3, buffPercentage: 0.3, turns: 40,levelUp: 300},
      {lv: 4, buffPercentage: 0.4, turns: 50,levelUp: 450},
      {lv: 5, buffPercentage: 0.5, turns: 60,levelUp: -1}
    ]
  }

  Skill_Clever.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    let prop = window[this.constructor.name].prop;
    let effect = CharUtils.getTargetEffect(realSrc, Skill_Clever);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let index = this.lv - 1;
    let buffAmount = Math.round(10 + 5 * index + realSrc.param(4) * 0.1);
    realSrc._buffs[4] += buffAmount;
    realSrc.status.skillEffect.push({
      skill: this,
      effectCount: prop.effect[index].turns,
      effectEnd: function() {
        realSrc._buffs[4] -= buffAmount;
      }
    });
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Scud

  Skill_Scud = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Scud.prototype = Object.create(ItemTemplate.prototype);
  Skill_Scud.prototype.constructor = Skill_Scud;

  Skill_Scud.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '俊足';
    this.description = '暫時速度提升';
    this.iconIndex = 82;
    this.mpCost = 15;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Scud.prop = {
    type: "SKILL",
    subType: "RANGE",
    effect: [
      {lv: 1, buffPercentage: 0.1, turns: 20, levelUp: 50},
      {lv: 2, buffPercentage: 0.2, turns: 30, levelUp: 150},
      {lv: 3, buffPercentage: 0.3, turns: 40, levelUp: 300},
      {lv: 4, buffPercentage: 0.4, turns: 50, levelUp: 450},
      {lv: 5, buffPercentage: 0.5, turns: 60, levelUp: -1}
    ]
  }

  Skill_Scud.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    let prop = window[this.constructor.name].prop;
    let effect = CharUtils.getTargetEffect(realSrc, Skill_Scud);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let index = this.lv - 1;
    let buffAmount = Math.round(10 + 5 * index + realSrc.param(6) * prop.effect[index].buffPercentage);
    realSrc._buffs[6] += buffAmount;
    realSrc.status.skillEffect.push({
      skill: this,
      effectCount: prop.effect[index].turns,
      effectEnd: function() {
        realSrc._buffs[6] -= buffAmount;
      }
    });
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Shield

  Skill_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Shield.prototype = Object.create(ItemTemplate.prototype);
  Skill_Shield.prototype.constructor = Skill_Shield;

  Skill_Shield.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '鐵壁';
    this.description = '暫時護甲強度提升';
    this.iconIndex = 81;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Shield.prop = {
    type: "SKILL",
    subType: "RANGE",
    effect: [
      {lv: 1, buffPercentage: 0.1, turns: 20, levelUp: 50},
      {lv: 2, buffPercentage: 0.2, turns: 30,levelUp: 150},
      {lv: 3, buffPercentage: 0.3, turns: 40,levelUp: 300},
      {lv: 4, buffPercentage: 0.4, turns: 50,levelUp: 450},
      {lv: 5, buffPercentage: 0.5, turns: 60,levelUp: -1}
    ]
  }

  Skill_Shield.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    let prop = window[this.constructor.name].prop;
    let effect = CharUtils.getTargetEffect(realSrc, Skill_Shield);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let index = this.lv - 1;
    let buffAmount = Math.round(3 + 5 * index + realSrc.param(4) * 0.1);
    realSrc.status.skillEffect.push({
      skill: this,
      effectCount: prop.effect[index].turns,
      amount: buffAmount,
      effectEnd: function() {
        realSrc._buffs[4] -= buffAmount;
      }
    });
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Hide

  Skill_Hide = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Hide.prototype = Object.create(ItemTemplate.prototype);
  Skill_Hide.prototype.constructor = Skill_Hide;

  Skill_Hide.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '隱匿';
    this.description = '隱藏自己的身影一段時間';
    this.mpCost = 5;
    this.tpCost = 50;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Hide.prop = {
    type: "SKILL",
    subType: "RANGE",
    effect: [
      {lv: 1, turn: 5, levelUp: 50},
      {lv: 2, turn: 6, levelUp: 150},
      {lv: 3, turn: 7, levelUp: 300},
      {lv: 4, turn: 8, levelUp: 450},
      {lv: 5, turn: 10, levelUp: -1}
    ]
  }

  Skill_Hide.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    if (CharUtils.playerCanSeeChar(src)) {
      if (src == $gamePlayer) {
        $gamePlayer.setOpacity(64);
      }
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 35));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let index = this.lv - 1;
    if (realSrc.status.invisibleCount < Skill_Hide.prop.effect[index].turn) {
      realSrc.status.invisibleCount = Skill_Hide.prop.effect[index].turn;
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_EatRot

  Skill_EatRot = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_EatRot.prototype = Object.create(ItemTemplate.prototype);
  Skill_EatRot.prototype.constructor = Skill_EatRot;

  Skill_EatRot.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '食腐';
    this.description = '安全食用腐爛的食物, 並獲得更多營養';
    this.iconIndex = 77;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_EatRot.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 1, nutritionPercentage: 0.6, levelUp: 10},
      {lv: 2, nutritionPercentage: 0.65, levelUp: 30},
      {lv: 3, nutritionPercentage: 0.7, levelUp: 60},
      {lv: 4, nutritionPercentage: 0.75, levelUp: 90},
      {lv: 5, nutritionPercentage: 0.8, levelUp: -1}
    ]
  }

  //-----------------------------------------------------------------------------------
  // Skill_DarkFire

  Skill_DarkFire = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_DarkFire.prototype = Object.create(ItemTemplate.prototype);
  Skill_DarkFire.prototype.constructor = Skill_DarkFire;

  Skill_DarkFire.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '暗滅';
    this.description = '直線射出一顆黑色火球, 魔法傷害';
    this.iconIndex = 64;
    this.mpCost = 15;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_DarkFire.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC",
    effect: [
      {lv: 1, baseDamage: 15, distance: 5, levelUp: 50},
      {lv: 2, baseDamage: 20, distance: 5, levelUp: 150},
      {lv: 3, baseDamage: 25, distance: 6, levelUp: 300},
      {lv: 4, baseDamage: 30, distance: 6, levelUp: 450},
      {lv: 5, baseDamage: 35, distance: 7, levelUp: -1}
    ]
  }

  Skill_DarkFire.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    CharUtils.decreaseMp(realSrc, this.mpCost);
    CharUtils.decreaseTp(realSrc, this.tpCost);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      // player get exp
      if (realSrc == $gameActors.actor(1)) {
        CharUtils.playerGainIntExp(1);
      }
      let damage = window[this.skill.constructor.name].prop.effect[this.skill.lv - 1].baseDamage
        + Math.floor(realSrc.param(4) / 5) - realTarget.param(9);
      damage = BattleUtils.getFinalDamage(damage);
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeChar(target)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 121));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let data = new ProjectileData(this, '!Flame2', 5
      , window[this.constructor.name].prop.effect[this.lv - 1].distance, hitCharFunc);
    new Projectile_SingleTarget(src, x, y, data);
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Soul_Obtained_Action
  //
  // actions for souls obtained

  Soul_Obtained_Action = function() {
    throw new Error('This is a static class');
  }

  Soul_Obtained_Action.learnSkill = function(soulClass) {
    let skillClass = window["Skill_" + soulClass.name.split('_')[1]];
    if (skillClass) {
      $gameActors.actor(1).learnSkill(new skillClass());
    }
  }

  // Window_GetDropItemList
  // 
  // The window for items get/drop

  function Window_GetDropItemList() {
    this.initialize.apply(this, arguments);
  }

  Window_GetDropItemList.prototype = Object.create(Window_ItemList.prototype);
  Window_GetDropItemList.prototype.constructor = Window_GetDropItemList;

  Window_GetDropItemList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_GetDropItemList.prototype.includes = function (item) {
    try {
      var prop = JSON.parse(item.note);
      return prop.type && prop.type != "SOUL";
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_GetDropItemList.prototype.isEnabled = function(item) {
    return item;
  };

  //-----------------------------------------------------------------------------------
  // Scene_GetItem
  //
  // handle the action when trying to pick up item from the ground
  Scene_GetItem = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_GetItem.prototype = Object.create(Scene_Item.prototype);
  Scene_GetItem.prototype.constructor = Scene_GetItem;

  Scene_GetItem.prototype.initialize = function () {
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

  Scene_GetItem.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_GetItem.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popSceneAndRestoreItems.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_GetItem.prototype.popSceneAndRestoreItems = function () {
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

  Scene_GetItem.prototype.onItemOk = function () {
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
      // pop scene if itemPile is empty
      if (itemPile.objectStack.length == 0) {
        this.popSceneAndRestoreItems();
      }
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

  Scene_DropItem.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_DropItem.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_DropItem.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      this.moved = true;
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      // setup item to itemPile on the ground
      ItemUtils.addItemToItemPile($gamePlayer._x, $gamePlayer._y, this.item());
      ItemUtils.tempObjStack.push(this.item());
      // check if inventory is empty
      let items = $gameParty.allItemsExceptSouls();
      if (items.length == 0) {
        this.popScene();
      }
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
  // Window_WarSkill
  //
  // window for displaying war skill
  function Window_WarSkill() {
    this.initialize.apply(this, arguments);
  }

  Window_WarSkill.prototype = Object.create(Window_SkillList.prototype);
  Window_WarSkill.prototype.constructor = Window_WarSkill;

  Window_WarSkill.prototype.initialize = function (x, y, width, height) {
    Window_SkillList.prototype.initialize.call(this, x, y, width, height);
    this.setActor($gameActors.actor(1));
    this.setStypeId(2);
  };

  Window_WarSkill.prototype.isEnabled = function(item) {
    return item;
  };

  //-----------------------------------------------------------------------------------
  // Scene_WarSkill
  //
  // scene for trying to perfom war skill

  function Scene_WarSkill() {
    this.initialize.apply(this, arguments);
  }

  Scene_WarSkill.prototype = Object.create(Scene_Skill.prototype);
  Scene_WarSkill.prototype.constructor = Scene_WarSkill;

  Scene_WarSkill.prototype.initialize = function() {
    Scene_Skill.prototype.initialize.call(this);
  };

  Scene_WarSkill.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  Scene_WarSkill.prototype.createItemWindow = function() {
    var wx = 0;
    var wy = this._helpWindow.height;
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_WarSkill(wx, wy, ww, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok',     this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this._itemWindow.activate();
    this._itemWindow.selectLast();
  };

  Scene_WarSkill.prototype.refreshActor = function() {
    var actor = this.actor();
    this._itemWindow.setActor(actor);
  };

  Scene_WarSkill.prototype.onItemOk = function() {
    SkillUtils.performSkill(this.item());
    this.popScene();
  };

    //-----------------------------------------------------------------------------------
  // Window_CastMagic
  //
  // window for displaying magic skill
  function Window_CastMagic() {
    this.initialize.apply(this, arguments);
  }

  Window_CastMagic.prototype = Object.create(Window_SkillList.prototype);
  Window_CastMagic.prototype.constructor = Window_CastMagic;

  Window_CastMagic.prototype.initialize = function (x, y, width, height) {
    Window_SkillList.prototype.initialize.call(this, x, y, width, height);
    this.setActor($gameActors.actor(1));
    this.setStypeId(1);
  };

  Window_CastMagic.prototype.isEnabled = function(item) {
    return item;
  };

  //-----------------------------------------------------------------------------------
  // Scene_CastMagic
  //
  // scene for trying to cast magic

  function Scene_CastMagic() {
    this.initialize.apply(this, arguments);
  }

  Scene_CastMagic.prototype = Object.create(Scene_WarSkill.prototype);
  Scene_CastMagic.prototype.constructor = Scene_CastMagic;

  Scene_CastMagic.prototype.initialize = function() {
    Scene_WarSkill.prototype.initialize.call(this);
  };

  Scene_CastMagic.prototype.createItemWindow = function() {
    var wx = 0;
    var wy = this._helpWindow.height;
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_CastMagic(wx, wy, ww, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok',     this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this._itemWindow.activate();
    this._itemWindow.selectLast();
  };

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
      value = value * this.paramRate(paramId) + this._buffs[paramId];
      var maxValue = this.paramMax(paramId);
      var minValue = this.paramMin(paramId);
      let modifier = 1;
      if (this.status) {
        if (this.status.bellyStatus == 'FAINT') {
          modifier = 0.5;
        } else if (this.status.bellyStatus == 'WEAK') {
          modifier = 0.7;
        }
      }
      return Math.round(value.clamp(minValue, maxValue) * modifier);
    } else {
      let attrParamId = paramId - 8;
      if (attrParamId == 2) {
        return this.xparam(attrParamId);
      } else {
        let value = Math.round(this.xparam(paramId - 8) * 100);
        if (attrParamId == 0) {
          let skillEffect = CharUtils.getTargetEffect(this, Skill_Shield);
          if (skillEffect) {
            value += skillEffect.amount;
          }
          if (this.status.breakArmorCount > 0) {
            value = Math.floor(value / 2);
          }
        }
        return value;
      }
    }
  };

  // modify this to show weapon dices
  Game_BattlerBase.prototype.xparam = function(xparamId) {
    if (xparamId == 2 && this.traits[2]) {
      return this.traits(Game_BattlerBase.TRAIT_XPARAM)[2].value;
    } else {
      return this.traitsSum(Game_BattlerBase.TRAIT_XPARAM, xparamId);
    }
  };

  Game_BattlerBase.prototype.traitsSum = function(code, id) {
    return this.traitsWithId(code, id).reduce(function(r, trait) {
      return (code == 22 && id == 2) ? trait.value : r + trait.value;
    }, 0);
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

  Scene_Equip.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createStatusWindow();
    this.createSlotWindow();
    this.createItemWindow();
    this.refreshActor();
  };

  Scene_Equip.prototype.createSlotWindow = function() {
    var wx = this._statusWindow.width;
    var wy = this._helpWindow.height;
    var ww = Graphics.boxWidth - this._statusWindow.width;
    var wh = this._statusWindow.height;
    this._slotWindow = new Window_EquipSlot(wx, wy, ww, wh);
    this._slotWindow.setHelpWindow(this._helpWindow);
    this._slotWindow.setStatusWindow(this._statusWindow);
    this._slotWindow.setHandler('ok',       this.onSlotOk.bind(this));
    this._slotWindow.setHandler('cancel',   this.popScene.bind(this));
    this.addWindow(this._slotWindow);
    setTimeout(function(vm) {
      vm._slotWindow.activate();
      vm._slotWindow.select(0);
    }, 100, this);
  };

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
      var skillLv = item.lv;
      var iconBoxWidth = Window_Base._iconWidth + 4;
      this.resetTextColor();
      this.drawIcon(item.iconIndex, x + 2, y + 2);
      let hotkey = SkillUtils.getHotKey(item);
      let postfix = (hotkey != null) ? (' {' + hotkey + '}') : '';
      this.drawText(item.name + 'Lv' + skillLv + postfix, x + iconBoxWidth, y, width - iconBoxWidth);
    }
  };

  // do not show lv0 skills
  Window_SkillList.prototype.makeItemList = function() {
    if (this._actor) {
      this._data = this._actor.skills().filter(function(item) {
        let show = true;
        if (item.lv == 0) {
          show = false;
        }
        return this.includes(item) && show;
      }, this);
    } else {
      this._data = [];
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

  Game_Party.prototype.hasSoul = function(soulClass) {
    for (let id in this._items) {
      if (this._items[id].constructor.name == soulClass.name) {
        return true;
      }
    }
    return false;
  }

  Game_Party.prototype.allItemsExceptSouls = function() {
    return this.allItems().filter(function(item) {
      try {
        var prop = JSON.parse(item.note);
        return prop.type && prop.type != "SOUL";
      } catch (e) {
        // do nothing
      }
      return false;
    })
  }

  Game_Party.prototype.gainExp

  //-----------------------------------------------------------------------------------
  // DataManager
  //
  // override this to implement item instances
  DataManager.isItem = function (item) {
    return item && item.itypeId;
  };

  DataManager.isWeapon = function (item) {
    return item && item.etypeId && item.etypeId == 1;
  };

  DataManager.isArmor = function (item) {
    return item && item.etypeId && item.etypeId != 1;
  };

  // modify this so we can generate maps dynamically
  DataManager.loadMapData = function(mapId) {
    if (mapId > 0) {
      var filename;
      if (mapId == 1) {
        filename = 'Map%1.json'.format(mapId.padZero(3));
      } else {
        filename = 'Map002.json';
      }
      this._mapLoader = ResourceHandler.createLoader('data/' + filename, this.loadDataFile.bind(this, '$dataMap', filename));
      this.loadDataFile('$dataMap', filename);
    } else {
      this.makeEmptyMap();
    }
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
        let name = ItemUtils.getItemDisplayName(item);
        if ($gameVariables[0].defaultProjectile
          && ItemUtils.getItemDisplayName(item) == ItemUtils.getItemDisplayName($gameVariables[0].defaultProjectile)) {
          name += ' {投擲}';
        }
        this.drawText(name, x + iconBoxWidth, y, width - iconBoxWidth);
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
    return item;
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

  Scene_EatFood.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_EatFood.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_FoodList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_EatFood.prototype.onItemOk = function () {
    if ($gameActors.actor(1).status.bellyStatus == 'FULL') {
      this.popScene();
      let func = function() {
        MapUtils.displayMessage(Message.display('eatWhenFull'));
      }
      setTimeout(func, 100);
    } else {
      $gameParty.setLastItem(this.item());
      if (this.item()) {
        // remove item from player inventory
        $gameParty.loseItem(this.item(), 1);
        if (this.item().name.includes(groundWord)) {
          ItemUtils.removeItemFromItemPile($gamePlayer._x, $gamePlayer._y, this.item());
        }
        this.popScene();
        var func = function (item) {
          TimeUtils.afterPlayerMoved(10 * $gameVariables[0].gameTimeAmp);
          let msg = String.format(Message.display('eatingDone'), item.name);
          if (item.status == 'FRESH' || item.status == 'PERMANENT') {
            $gameActors.actor(1).nutrition += item.nutrition;
          } else {
            // TODO: implement eat rotten food skill
            if ($gameParty.hasSoul(Soul_EatRot)) {
              msg += '\n' + Message.display('eatRottenUneffected');
              let skill = SkillUtils.getSkillInstance($gameActors.actor(1), Skill_EatRot);
              let index = skill.lv - 1;
              $gameActors.actor(1).nutrition
                += Math.floor(item.nutrition * Skill_EatRot.prop.effect[index].nutritionPercentage);
              SkillUtils.gainSkillExp($gameActors.actor(1), skill, index, Skill_EatRot.prop);
            } else {
              $gameActors.actor(1).nutrition += Math.floor(item.nutrition / 2);
              msg += '\n' + Message.display('eatRottenEffected');
              let attrId = getRandomInt(5);
              switch (attrId) {
                case 0:
                  msg += '\n' + Message.display('strDown');
                  break;
                case 1:
                  msg += '\n' + Message.display('vitDown');
                  break;
                case 2:
                  msg += '\n' + Message.display('intDown');
                  break;
                case 3:
                  msg += '\n' + Message.display('wisDown');
                  break;
                case 4:
                  msg += '\n' + Message.display('agiDown');
                  break;
              }
              $gameActors.actor(1)._paramPlus[attrId + 2] -= 1;
            }
          }
          CharUtils.decreaseNutrition($gamePlayer);
          MapUtils.addBothLog(msg);
        }
        setTimeout(func.bind(null, this.item()), 100);
      }
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
    return item;
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

  Scene_QuaffPotion.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  Scene_QuaffPotion.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_PotionList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_QuaffPotion.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      this.popScene();
      var func = function (item) {
        LogUtils.addLog(String.format(Message.display('quaffPotion'), ItemUtils.getItemDisplayName(item)));
        item.onQuaff($gamePlayer, true);
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
    return item;
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

  Scene_ReadScroll.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_ReadScroll.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_ScrollList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_ReadScroll.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      // remove item from player inventory
      $gameParty.loseItem(this.item(), 1);
      this.popScene();
      var func = function (item) {
        LogUtils.addLog(String.format(Message.display('readScroll'), ItemUtils.getItemDisplayName(item)));
        item.onRead($gamePlayer, true);
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
      return prop.type && (prop.type == "POTION" || prop.type == "DART");
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_ProjectileList.prototype.isEnabled = function(item) {
    return item;
  };

  //-----------------------------------------------------------------------------------
  // Scene_FireProjectile
  //
  // handle the action firing projectile
  Scene_FireProjectile = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_FireProjectile.prototype = Object.create(Scene_Item.prototype);
  Scene_FireProjectile.prototype.constructor = Scene_FireProjectile;

  Scene_FireProjectile.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
  };

  Scene_FireProjectile.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  // override this function so it creates Window_GetDropItemList window
  Scene_FireProjectile.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_ProjectileList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_FireProjectile.prototype.askProjectileDirection = function() {
    var func = function () {
      if (!SceneManager._scene.isActive()) {
        setTimeout(func, 10);
        return;
      }
      let prop = JSON.parse($gameVariables[0].fireProjectileInfo.item.note);
      if (prop.type == 'POTION') {
        $gameVariables[0].directionalAction = Projectile_Potion.prototype.createProjectile;
      } else {
        $gameVariables[0].directionalAction = Projectile_Item.prototype.createProjectile;
      }
      $gameVariables[0].directionalFlag = true;
      MapUtils.displayMessage('往哪個方向投擲?');
    }
    func();
  }

  Scene_FireProjectile.prototype.onItemOk = function () {
    $gameParty.setLastItem(this.item());
    if (this.item()) {
      $gameVariables[0].fireProjectileInfo.item = this.item();
      this.popScene();
      Scene_FireProjectile.prototype.askProjectileDirection();
    }
    this._itemWindow.refresh();
    this._itemWindow.activate();
  };

  // CraftUtils
  //
  // utilities for crafting items

  CraftUtils = function () {
    throw new Error('This is a static class');
  }

  CraftUtils.genMaterialArray = function(itemClass) {
    let materials = itemClass.material;
    let result = [];
    for (let id in materials) {
      result.push({
        item: new materials[id].itemClass(),
        amount: materials[id].amount
      })
    }
    return result;
  }

  CraftUtils.hasMaterialFromRecipe = function(itemClass) {
    let materials = CraftUtils.genMaterialArray(itemClass);
    let inventory = $gameParty.allItems();
    for (let id in materials) {
      let obj = materials[id];
      for (let id2 in inventory) {
        if (inventory[id2].constructor.name == obj.item.constructor.name) {
          return true;
        }
      }
    }
    return false;
  }

  //-----------------------------------------------------------------------------------
  // Scene_SetupProjectile
  //
  // setup default projectile to fire
  Scene_SetupProjectile = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_SetupProjectile.prototype = Object.create(Scene_FireProjectile.prototype);
  Scene_SetupProjectile.prototype.constructor = Scene_SetupProjectile;

  Scene_SetupProjectile.prototype.initialize = function () {
    Scene_FireProjectile.prototype.initialize.call(this);
  };

  Scene_SetupProjectile.prototype.onItemOk = function () {
    if ($gameVariables[0].defaultProjectile && $gameVariables[0].defaultProjectile.name == this.item().name) {
      $gameVariables[0].defaultProjectile = null;
    } else {
      $gameVariables[0].defaultProjectile = this.item();
    }
    this.popScene();
  };

  //-----------------------------------------------------------------------------
  // Window_CraftCommand
  //
  // The window for selecting craft command on craft scene.

  function Window_CraftCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftCommand.prototype = Object.create(Window_ShopCommand.prototype);
  Window_CraftCommand.prototype.constructor = Window_CraftCommand;

  Window_CraftCommand.prototype.makeCommandList = function() {
    this.addCommand('製造',    'craft');
    // this.addCommand('強化',   'enforce');
  };

  //-----------------------------------------------------------------------------
  // Window_CraftRecipes
  //
  // The window for selecting an item to craft on craft screen.

  function Window_CraftRecipes() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftRecipes.prototype = Object.create(Window_ShopBuy.prototype);
  Window_CraftRecipes.prototype.constructor = Window_CraftRecipes;

  Window_CraftRecipes.prototype.initialize = function(x, y, height, recipes) {
    Window_ShopBuy.prototype.initialize.call(this, x, y, height, recipes);
  };

  Window_CraftRecipes.prototype.makeItemList = function() {
    this._data = this._shopGoods;
  };

  Window_CraftRecipes.prototype.drawItem = function(index) {
    var item = this._data[index];
    var rect = this.itemRect(index);
    rect.width -= this.textPadding();
    this.changePaintOpacity(this.isEnabled(item));
    this.drawItemName(item, rect.x, rect.y, rect.width);
    this.changePaintOpacity(true);
  };

  Window_CraftRecipes.prototype.isEnabled = function(item) {
    if (item) {
      let materials = CraftUtils.genMaterialArray(window[item.constructor.name]);
      let inventory = $gameParty.allItems();
      for (let id in inventory) {
        let item = inventory[id];
        for (let id2 in materials) {
          let obj = materials[id2];
          if (obj.item.constructor.name == item.constructor.name) {
            obj.amount--;
            if (obj.amount == 0) {
              materials.splice(id2, 1);
            }
            break;
          }
        }
      }
      return materials.length == 0;
    }
    return false;
  };

  //-----------------------------------------------------------------------------
  // Window_CraftStatus
  //
  // The window for displaying craft status on craft screen.

  function Window_CraftStatus() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftStatus.prototype = Object.create(Window_Base.prototype);
  Window_CraftStatus.prototype.constructor = Window_CraftStatus;

  Window_CraftStatus.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._item = null;
    this.refresh();
  };

  Window_CraftStatus.prototype.refresh = function() {
    this.contents.clear();
    if (this._item) {
      let msg = '需要材料:';
      this.drawTextEx(msg, 0, 0);
      let materials = window[this._item.constructor.name].material;
      for (let i = 0; i < materials.length; i++) {
        this.drawItemName(new materials[i].itemClass(), 0, this.lineHeight() * (i + 1), 312, materials[i].amount);
      }
    }
  };

  Window_CraftStatus.prototype.setItem = function(item) {
    this._item = item;
    this.refresh();
  };

  Window_CraftStatus.prototype.drawItemName = function(item, x, y, width, amount) {
    width = width || 312;
    if (item) {
        var iconBoxWidth = Window_Base._iconWidth + 4;
        this.resetTextColor();
        this.drawIcon(item.iconIndex, x + 2, y + 2);
        this.drawText(ItemUtils.getItemDisplayName(item) + ' x ' + amount, x + iconBoxWidth, y, width - iconBoxWidth);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_CraftProcedure
  //
  // The window for displaying craft procedure on craft screen.

  function Window_CraftProcedure() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftProcedure.prototype = Object.create(Window_Base.prototype);
  Window_CraftProcedure.prototype.constructor = Window_CraftProcedure;

  Window_CraftProcedure.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._item = null;
    this.refresh();
  };

  Window_CraftProcedure.prototype.refresh = function() {
    this.contents.clear();
    let msg = '尚缺材料:';
    this.drawTextEx(msg, 0, 0);
    let materials = SceneManager._scene._materialShortages;
    for (let i = 0; i < materials.length; i++) {
      this.drawItemName(materials[i].item, 0, this.lineHeight() * (i + 1), 312, materials[i].amount);
    }
  };

  Window_CraftProcedure.prototype.setItem = function(item) {
    this._item = item;
    this.refresh();
  };

  Window_CraftProcedure.prototype.drawItemName = function(item, x, y, width, amount) {
    width = width || 312;
    if (item) {
        var iconBoxWidth = Window_Base._iconWidth + 4;
        this.resetTextColor();
        this.drawIcon(item.iconIndex, x + 2, y + 2);
        this.drawText(ItemUtils.getItemDisplayName(item) + ' x ' + amount, x + iconBoxWidth, y, width - iconBoxWidth);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_Material
  //
  // The window for selecting an material for crafting on craft screen.

  function Window_Material() {
    this.initialize.apply(this, arguments);
  }

  Window_Material.prototype = Object.create(Window_ShopBuy.prototype);
  Window_Material.prototype.constructor = Window_Material;

  Window_Material.prototype.initialize = function(x, y, height) {
    Window_ShopBuy.prototype.initialize.call(this, x, y, height, []);
  };

  Window_Material.prototype.makeItemList = function() {
    this._data = this._shopGoods;
  };

  Window_Material.prototype.filterMaterial = function() {
    this._shopGoods = $gameParty.allItems().filter(function(item) {
      let shortages = SceneManager._scene._materialShortages;
      for (let id in shortages) {
        if (item.constructor.name == shortages[id].item.constructor.name) {
          return true;
        }
      }
      return false;
    });
    this.makeItemList();
  }

  Window_Material.prototype.drawItem = function(index) {
    var item = this._data[index];
    var rect = this.itemRect(index);
    rect.width -= this.textPadding();
    this.changePaintOpacity(this.isEnabled(item));
    this.drawItemName(item, rect.x, rect.y, rect.width);
    this.changePaintOpacity(true);
  };

  Window_Material.prototype.isEnabled = function(item) {
    if (item) {
      let shortages = SceneManager._scene._materialShortages;
      for (let id in shortages) {
        if (item.constructor.name == shortages[id].item.constructor.name) {
          return true;
        }
      }
      return false;
    }
    return false;
  };

  //-----------------------------------------------------------------------------
  // Window_CraftHelp
  //
  // The window for displaying the description of the selected item on craft screen.

  function Window_CraftHelp() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftHelp.prototype = Object.create(Window_Help.prototype);
  Window_CraftHelp.prototype.constructor = Window_CraftHelp;

  Window_CraftHelp.prototype.setItem = function(item) {
    this.setText(item ? window[item.constructor.name].itemDescription : '');
  };

  //-----------------------------------------------------------------------------
  // Scene_Craft
  //
  // The scene class of the crafting screen.

  function Scene_Craft() {
    this.initialize.apply(this, arguments);
  }

  Scene_Craft.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_Craft.prototype.constructor = Scene_Craft;

  Scene_Craft.prototype.initialize = function() {
    this._recipes = [];
    for (let id in ItemUtils.recipes) {
      let recipe = ItemUtils.recipes[id];
      if (CraftUtils.hasMaterialFromRecipe(recipe)) {
        this._recipes.push(new recipe());
      }
    }
    this._materialShortages = []; // element format: {item: itemInstance, amount: integer}
    this._materialStack = [];
    this._item = null;
    Scene_MenuBase.prototype.initialize.call(this);
  };

  Scene_Craft.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createCraftHelpWindow();
    this.createMaterialHelpWindow();
    this.createCommandWindow();
    this.createDummyWindow();
    this.createProcedureWindow();
    this.createCraftStatusWindow();
    this.createCraftWindow();
    this.createMaterialWindow();
  };

  Scene_Craft.prototype.genMaterialShortages = function() {
    this._materialShortages = CraftUtils.genMaterialArray(window[this._item.constructor.name]);
  }

  Scene_Craft.prototype.addMaterial = function(item) {
    for (let id in this._materialShortages) {
      let obj = this._materialShortages[id];
      if (item.constructor.name == obj.item.constructor.name) {
        obj.amount--;
        if (obj.amount == 0) {
          this._materialShortages.splice(id, 1);
        }
        this._materialStack.push(item);
        break;
      }
    }
    return this._materialShortages.length == 0;
  }

  Scene_Craft.prototype.removeMaterial = function() {
    let itemPop = this._materialStack.pop();
    if (itemPop) {
      let obj;
      for (let id in this._materialShortages) {
        if (this._materialShortages[id].item.constructor.name == itemPop.constructor.name) {
          obj = this._materialShortages[id];
          break;
        }
      }
      if (obj) {
        obj.amount++;
      } else {
        this._materialShortages.push({item: itemPop, amount: 1});
      }
    }
    return itemPop;
  }

  Scene_Craft.prototype.createCraftHelpWindow = function() {
    this._craftHelpWindow = new Window_CraftHelp();
    this._craftHelpWindow.drawTextEx(Message.display('craftSceneHelpMessage'), 0, 0);
    this.addWindow(this._craftHelpWindow);
  };

  Scene_Craft.prototype.createMaterialHelpWindow = function() {
    this._materialHelpWindow = new Window_Help();
    this._materialHelpWindow.hide();
    this.addWindow(this._materialHelpWindow);
  };

  Scene_Craft.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_CraftCommand(Graphics.boxWidth);
    this._commandWindow.y = this._craftHelpWindow.height;
    this._commandWindow.setHandler('craft',    this.commandCraft.bind(this));
    // this._commandWindow.setHandler('enforce',   this.commandEnforce.bind(this));
    this._commandWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._commandWindow);
  };

  Scene_Craft.prototype.createDummyWindow = function() {
    var wy = this._commandWindow.y + this._commandWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._dummyWindow = new Window_Base(0, wy, Graphics.boxWidth, wh);
    this.addWindow(this._dummyWindow);
  };

  Scene_Craft.prototype.createProcedureWindow = function() {
    var wx = 456;
    var wy = this._dummyWindow.y;
    var wh = this._dummyWindow.height;
    var ww = Graphics.boxWidth - wx;
    this._procedureWindow = new Window_CraftProcedure(wx, wy, ww, wh);
    this._procedureWindow.hide();
    this.addWindow(this._procedureWindow);
  };

  Scene_Craft.prototype.createCraftStatusWindow = function() {
    var wx = 456;
    var wy = this._dummyWindow.y;
    var ww = Graphics.boxWidth - wx;
    var wh = this._dummyWindow.height;
    this._craftStatusWindow = new Window_CraftStatus(wx, wy, ww, wh);
    this._craftStatusWindow.hide();
    this.addWindow(this._craftStatusWindow);
  };

  Scene_Craft.prototype.createCraftWindow = function() {
    var wy = this._dummyWindow.y;
    var wh = this._dummyWindow.height;
    this._craftWindow = new Window_CraftRecipes(0, wy, wh, this._recipes);
    this._craftWindow.setHelpWindow(this._craftHelpWindow);
    this._craftWindow.setStatusWindow(this._craftStatusWindow);
    this._craftWindow.hide();
    this._craftWindow.setHandler('ok',     this.onCraftOk.bind(this));
    this._craftWindow.setHandler('cancel', this.onCraftCancel.bind(this));
    this.addWindow(this._craftWindow);
  };

  Scene_Craft.prototype.createMaterialWindow = function() {
    var wy = this._dummyWindow.y;
    var wh = this._dummyWindow.height;
    this._materialWindow = new Window_Material(0, wy, wh);
    this._materialWindow.setHelpWindow(this._materialHelpWindow);
    this._materialWindow.setStatusWindow(this._procedureWindow);
    this._materialWindow.hide();
    this._materialWindow.setHandler('ok',     this.onMaterialOk.bind(this));
    this._materialWindow.setHandler('cancel', this.onMaterialCancel.bind(this));
    this.addWindow(this._materialWindow);
  };

  Scene_Craft.prototype.activateCraftWindow = function() {
    this._craftWindow.show();
    this._craftWindow.activate();
    this._craftStatusWindow.show();
  };

  Scene_Craft.prototype.commandCraft = function() {
    this._dummyWindow.hide();
    this.activateCraftWindow();
  };

  Scene_Craft.prototype.commandEnforce = function() {
    this._dummyWindow.hide();
    this._categoryWindow.show();
    this._categoryWindow.activate();
    this._materialWindow.show();
    this._materialWindow.deselect();
    this._materialWindow.refresh();
  };

  Scene_Craft.prototype.onCraftOk = function() {
    this._item = this._craftWindow.item();
    this.genMaterialShortages();
    this._craftWindow.hide();
    this._craftHelpWindow.hide();
    this._craftStatusWindow.hide();
    this._materialHelpWindow.show();
    this._materialWindow.filterMaterial();
    this._materialWindow.refresh();
    this._materialWindow.show();
    this._materialWindow.activate();
    this._procedureWindow.show();
  };

  Scene_Craft.prototype.onCraftCancel = function() {
    this._commandWindow.activate();
    this._dummyWindow.show();
    this._craftWindow.hide();
    this._craftStatusWindow.hide();
    this._craftStatusWindow.setItem(null);
    this._craftHelpWindow.clear();
    this._craftHelpWindow.drawTextEx(Message.display('craftSceneHelpMessage'), 0, 0);
  };

  Scene_Craft.prototype.onMaterialOk = function() {
    SoundManager.playShop();
    let item = this._materialWindow.item();
    this._materialWindow._data.splice(this._materialWindow._data.indexOf(item), 1);
    if (this.addMaterial(item)) {
      for (let id in this._materialStack) {
        $gameParty.loseItem(this._materialStack[id], 1);
      }
      $gameParty.gainItem(this._item, 1);
      this.popScene();
      var func = function(item) {
        TimeUtils.afterPlayerMoved();
        MapUtils.addBothLog(String.format(Message.display('craftItemDone'), ItemUtils.getItemDisplayName(item)));
      }
      setTimeout(func, 100, this._item);
    }
    this._materialWindow.refresh();
    this._materialWindow.activate();
  };

  Scene_Craft.prototype.onMaterialCancel = function() {
    SoundManager.playCancel();
    let item = this.removeMaterial();
    if (item) {
      this._materialWindow._data.push(item);
      this._materialWindow.refresh();
      this._materialWindow.activate();
    } else {
      this._materialHelpWindow.hide();
      this._materialWindow.hide();
      this._procedureWindow.hide();
      this._craftWindow.show();
      this._craftHelpWindow.show();
      this._craftStatusWindow.show();
      this._craftWindow.activate();
    }
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

  Game_Actor.prototype.levelUp = function() {
    this._level++;
    CharUtils.levelUp(this);
    let msg = String.format(Message.display('levelUp'), LogUtils.getCharName(this));
    LogUtils.addLog(msg);
  };

  Game_Actor.prototype.levelDown = function() {
    this._level--;
    // TODO: implement level down mechanism
  };

  // modify EXP according to LV gap
  Game_Actor.prototype.gainExpLvGap = function(realTarget, exp) {
    let modifier = realTarget.level - this.level;
    if (modifier > 5) {
      modifier = 5;
    } else if (modifier < -5) {
      modifier = -5;
    }
    this.gainExp(exp * (1 + 0.2 * modifier));
  };

  // modify for skill instance
  Game_Actor.prototype.learnSkill = function(skill) {
    if (!this.isLearnedSkill(skill)) {
      this._skills.push(skill);
    }
  };

  Game_Actor.prototype.isLearnedSkill = function(skill) {
    for (let id in this._skills) {
      if (this._skills[id].constructor.name == skill.constructor.name) {
        return true;
      }
    }
    return false;
  };

  Game_Actor.prototype.skills = function() {
    return this._skills;
  };

  Game_Actor.prototype.findNewSkills = function(lastSkills) {
    return [];
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
