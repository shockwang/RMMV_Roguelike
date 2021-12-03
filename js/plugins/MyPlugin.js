// my plugin

(function () {
  var MapData = function(floorId, original, x, y) {
    this.base = floorId;
    // TODO: implement hollow condition
    // this.bush = 0; // for hollow usage
    // comment those variables for storage size issue, and also not used yet
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

  //-----------------------------------------------------------------------------------
  // MapDataUtils
  //
  // MapData related methods, aims to reduce save file size.

  MapDataUtils = function () {
    throw new Error('This is a static class');
  };

  MapDataUtils.getTileIndex = function(originalTile) {
    return tileTypeList.indexOf(originalTile);
  }

  MapDataUtils.getTileBlock = function(index) {
    return tileTypeList[index];
  }

  // data structure: aaaabcdeeff
  // aaaa: floorId, b: originalTileIndex, c: isExplored, d: isVisible, ee: x-axis, ff: y-axis
  MapDataUtils.create = function(floorId, original, x, y) {
    return y + x * 100 + MapDataUtils.getTileIndex(original) * 1000000 + floorId * 10000000;
  }

  MapDataUtils.setBase = function(mapData, baseId) {
    return baseId * 10000000 + mapData % 10000000;
  }

  MapDataUtils.getBase = function(mapData) {
    return Math.floor(mapData / 10000000);
  }

  MapDataUtils.setOriginalTile = function(mapData, original) {
    let prefix = Math.floor(mapData / 10000000);
    let postfix = Math.floor(mapData % 1000000);
    let index = MapDataUtils.getTileIndex(original);
    return prefix * 10000000 + index * 1000000 + postfix;
  }

  MapDataUtils.getOriginalTile = function(mapData) {
    return MapDataUtils.getTileBlock(Math.floor(mapData % 10000000 / 1000000));
  }

  // isExplored: 0 or 1
  MapDataUtils.setExplored = function(mapData, isExplored) {
    let prefix = Math.floor(mapData / 1000000);
    let postfix = Math.floor(mapData % 100000);
    return prefix * 1000000 + isExplored * 100000 + postfix;
  }

  MapDataUtils.getExplored = function(mapData) {
    return Math.floor(mapData % 1000000 / 100000);
  }

  // isVisible: 0 or 1
  MapDataUtils.setVisible = function(mapData, isVisible) {
    let prefix = Math.floor(mapData / 100000);
    let postfix = Math.floor(mapData % 10000);
    return prefix * 100000 + isVisible * 10000 + postfix;
  }

  MapDataUtils.getVisible = function(mapData) {
    return Math.floor(mapData % 100000 / 10000);
  }

  // x: range 0~99
  MapDataUtils.getX = function(mapData) {
    return Math.floor(mapData % 10000 / 100);
  }

  // y: range 0~99
  MapDataUtils.getY = function(mapData) {
    return mapData % 100;
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

  var MapVariable = function (mapData, rmDataMap, mapType) {
    this.mapData = mapData;
    this.rmDataMap = rmDataMap;
    this.mapType = mapType; // EARTH, ICE, FIRE, AIR, FOREST, BAT

    // indicates map attributes
    this.generateRandom = false;
    this.spawnTraps = true; // spawn random traps
    this.spawnMobs = true; // spawn random mobs
    this.spawnItems = true; // spawn random items
    this.bgm = null; // setup map bgm
    this.dungeonLevel = 1; // determine the level difficulty
    this.stairDownNum = 1;
    this.stairUpNum = 1;
    this.stairList = [];
    this.stairToList = []; // indicates which layer this stair leads to
    this.secretBlocks = {}; // indicates secret doors
    this.preDefinedStairs = []; // predefined stairs
    this.preDefinedTraps = []; // traps at indicated places
    this.preDefinedMobs = []; // predefined mob class
    this.mobStatusEffectList = []; // save mob status/effect when change map
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

  var ProjectileData = function(skill, imageData, distance, hitCharFunc, hitDoorFunc, hitWallFunc) {
    this.skill = skill;
    this.imageData = imageData;
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

  var MapBlocks = function(floor, water, hollow) {
    this.floor = floor;
    this.water = water;
    this.hollow = hollow;
  }

  var ScheduleEvent = function(target, execTime, statusName, skillEffect) {
    this.target = target;
    this.execTime = execTime;
    this.statusName = statusName;
    this.skillEffect = skillEffect;
  }

  var StatusEffect = function() {
    this.turns = 0;
    this.lastTime = 0;
  }

  var SkillData = function(skillClassName, lv) {
    this.skillClassName = skillClassName;
    this.lv = lv;
  }

  var TrapData = function(trapClassName, x, y, relatedEventClassName) {
    this.trapClassName = trapClassName;
    this.x = x;
    this.y = y;
    this.relatedEventClassName = relatedEventClassName;
  }

  // can not serialize
  var SpawnMobData = function(mobClass, percentage) {
    this.mobClass = mobClass;
    this.percentage = percentage;
  }

  var LootingData = function(itemClassName, percentage) {
    this.itemClassName = itemClassName;
    this.percentage = percentage;
  }

  var SoulData = function(soulClassName, percentage) {
    this.soulClassName = soulClassName;
    this.percentage = percentage;
  }

  var ResistanceData = function() {
    this.state = {
      blind: 0, // actually boolean, use integer to prevent multiple effects
      paralyze: 0,
      sleep: 0,
      poison: 0,
      afraid: 0,
      bleeding: 0,
      faint: 0,
      breakArmor: 0,
      wet: 0,
      acid: 0
    }
    this.elemental = {
      // percentage, 0~1
      cold: 0,
      fire: 0
    }
  }

  var PreDefinedMobData = function(mobClassName, coordinate) {
    this.mobClassName = mobClassName;
    this.coordinate = coordinate; // random place if null
  }

  var TutorialData = function(evtId) {
    this.evtId = evtId;
    this.triggered = false;
  }

  var FLOOR = '□';
  var WALL = '■';
  var DOOR = 'Ｄ';
  var WATER = 'Ｗ';
  var LAVA = 'Ｌ';
  var HOLLOW = 'Ｈ';
  var UPSTAIR = '＜';
  var DOWNSTAIR = '＞';
  var PRESS = 'Ｐ';

  // should keep this list length < 10
  var tileTypeList = [FLOOR, WALL, DOOR, WATER, LAVA, HOLLOW, UPSTAIR, DOWNSTAIR, PRESS];

  // ----------map constants----------
  var DungeonTiles = {
    earth: {
      ceilingCenter: 6752,
      floorCenter: 2816,
      waterCenter: 2048,
      hollowCenter: 3008
    },
    ice: {
      ceilingCenter: 6032,
      floorCenter: 3248,
      waterCenter: 2624,
      hollowCenter: 3440
    },
    fire: {
      ceilingCenter: 8098,
      floorCenter: 3584,
      lavaCenter: 2240,
      waterCenter: 2048, // use water tile from earth dungeon
      hollowCenter: 3776
    },
    air: {
      ceilingCenter: 5936,
      floorCenter: 3200,
      waterCenter: 2528,
      hollowCenter: 3392
    }
  }
  var warFogCenter = 15;
  var pressFloor = 1654;

  var dungeonDepth = 11; // dungeonDepth - 1 = main dungeon depth
  var subDungeonDepth = 5;
  var dungeonOffset = {
    ice: 20,
    fire: 30
  };

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
  var itemSpawnPercentage = 0.03;

  // game parameters
  var throwItemTpCost = 3;
  var attackTpCost = 5;
  var dashTpCost = 20;
  var walkTpRecover = 3;
  var restTpRecover = 6;
  var mobTraceRouteMaxDistance = 15;
  var regenTurnCount = 20;
  var genLocalDungeonObjectPercentage = 0.8;
  var mobFleeHpPercentage = 0.3;
  var carryObjectMaxNum = 52;
  var controlCommandDelay = 50;
  var skillLevelMax = 10;
  var bossHpMpMultiplier = 1.5;
  var bossDebuffTurnsMultiplier = 0.3;

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

    // rings
    result.rings = [];
    result.rings.push(new ImageData('Collections3', 0, 0, 8, '銀色戒指'));
    result.rings.push(new ImageData('Collections3', 0, 1, 8, '銀色蝕刻戒指'));
    result.rings.push(new ImageData('Collections3', 0, 2, 8, '金色戒指'));
    result.rings.push(new ImageData('Collections3', 1, 0, 8, '金色蝕刻戒指'));
    result.rings.push(new ImageData('Collections3', 1, 1, 8, '銀色鑲嵌戒指'));
    shuffle(result.rings, 0, result.rings.length - 1);

    result.items = [];
    // food
    result.items[11] = new ImageData('Meat', 0, 2, 2); // flesh
    result.items[14] = new ImageData('Outside_B1', 0, 0, 6); // drink
    result.items[20] = new ImageData('Collections1', 3, 0, 4); // cheese
    // material
    result.items[12] = new ImageData('Collections3', 0, 1, 2); // feather
    result.items[15] = new ImageData('Collections7', 2, 2, 6); // tail
    result.items[16] = new ImageData('Collections7', 3, 1, 6); // horn
    result.items[17] = new ImageData('Collections3', 1, 1, 2); // liquid
    result.items[18] = new ImageData('Collections3', 1, 0, 4); // crystal
    result.items[19] = new ImageData('Collections3', 2, 1, 6); // tentacle
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
  Message = {
    language: 'chinese',
    chinese: {
      meleeAttack: '{0}對{1}造成了{2}點傷害.',
      meleeAttackWithWeapon: '{0}揮動{1}, 對{2}造成了{3}點傷害.',
      meleeAttackAir: '{0}對空氣發動攻擊.',
      shootProjectile: '{0}發射了{1}!',
      projectileAttack: '{0}的{1}對{2}造成了{3}點傷害.',
      targetKilled: '{0}被{1}殺死了!',
      targetDied: '{0}死了...',
      openDoor: '{0}打開了一扇門.',
      seeDoorOpen: '你看到一扇門被打開.',
      hearDoorOpen: '你聽見開門的聲音',
      closeDoor: '{0}關上了一扇門.',
      seeDoorClose: '你看到一扇門被關上.',
      hearDoorClose: '你聽見關門的聲音.',
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
      identifyPrompt: '請選擇要鑑定的物品',
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
      throwItemHitLava: '{0}掉入岩漿中融化了.',
      throwItemBroken: '{0}壞掉了!',
      monsterFlee: '{0}轉身逃跑!',
      recoverFromAfraid: '{0}恢復鎮定了.',
      bumpWall: '{0}撞在牆上.',
      bumpDoor: '{0}撞在門上.',
      blind: '{0}失去視覺了!',
      recoverFromBlind: '{0}的視覺恢復了.',
      paralyze: '{0}麻痺了!',
      recoverFromParalyze: '{0}又能夠行動了.',
      paralyzeResisted: '{0}打了個冷顫.',
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
      mobArmorAcidDamage: '{0}的護甲受到了酸的侵蝕!',
      mobWeaponAcidDamage: '{0}的武器受到了酸的侵蝕!',
      poison: '{0}中毒了!',
      recoverFromPoison: '{0}從毒素中恢復了.',
      poisonDamage: '{0}受到了{1}點毒素傷害.',
      wet: '{0}渾身溼透了.',
      recoverFromWet: '{0}的身體乾燥了.',
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
      stateBlind: '失明',
      stateParalyze: '麻痺',
      stateSleep: '昏睡',
      statePoison: '中毒',
      stateBleeding: '出血',
      stateBreakArmor: '破甲',
      stateWet: '濡濕',
      stateAcid: '酸蝕',
      attackOutOfEnergy: '{0}想發動攻擊, 但是沒有足夠的體力!',
      askDirection: '往哪個方向?',
      attackAir: '{0}對空氣發動了{1}.',
      self: '自己',
      player: '你',
      hotkeyUndefined: '未定義的熱鍵.',
      trapFloated: '{0}漂浮經過{1}, 並未受到傷害.',
      spikeTrapTriggered: '{0}一腳踩上尖刺陷阱, 受到{1}點傷害!',
      teleportTrapTriggered: '{0}觸動了傳送陷阱.',
      seeTeleportAway: '{0}突然從你眼前消失了!',
      seeTeleportAppear: '{0}突然出現在你面前!',
      secretTrapDiscovered: '你找到了一個隱藏的{0}.',
      groundHoleTrapTriggered: '{0}失足掉入地洞陷阱, 受到{1}點傷害!',
      climbOutFailed: '{0}嘗試爬出地洞, 但是失敗了.',
      climbOutSuccess: '{0}爬出了地洞.',
      moveFailedInGroundHole: '你還在地洞中呢.',
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
      carryDownToNormal: '你的速度不再因為重量而受限了.',
      carryUpToBurdened: '你的動作因為身上的重量稍微變慢.',
      carryDownToBurdened: '你的動作僅僅因為重量變慢了一點.',
      carryUpToStressed: '你的動作因為身上的重量而大幅變慢.',
      carryDownToStressed: '你身上的重量稍微輕了一點, 然而動作仍然十分緩慢.',
      carryUpToStrained: '你因身上的重壓而顫抖著, 移動一步都感覺艱辛!',
      carryDownToStrained: '你稍微可以移動身體了, 但是移動仍然十分艱辛.',
      carryUpToOverloaded: '你被徹底壓垮, 一步也動不了了!',
      damageFromCarryTooMuch: '你的筋骨因為重壓而滋嘎作響, 受到{0}點傷害.',
      damageFallFromStair: '你從樓梯上摔下來, 受到{0}點傷害.',
      actionBlockedOverloaded: '你身上的重量壓得你無法動作!',
      getItemFailedMaxNum: '你無法再撿起更多東西了!',
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
      kickSelf: '你無法踹向自己!',
      kickEnemy: '你一腳踹向{0}, 造成{1}點傷害!',
      kickVisibleDoor: '你踹開了一道門!',
      kickInvisibleDoor: '你踹開了一道隱藏門!',
      kickWall: '你一腳踹向牆壁, 受到了{0}點傷害!',
      kickAir: '你一腳踹在空中, 感覺十分難受!',
      legWounded: '你的腿受傷了!',
      tryKickWhenLegWounded: '你的腿受傷了, 無法進行這個動作.',
      recoverFromLegWounded: '你的腿感覺好多了.',
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
      jumpIntoWater: '{0}跳入水中.',
      climbOutOfWater: '{0}爬上岸邊.',
      pushObject: '{0}推動了{1}.',
      bolderFilledHole: '{0}填滿了空洞, 形成可行走的陸地.',
      bolderHitHollow: '{0}墜入了虛空, 不見蹤影.',
      iceMeltInWater: '{0}在水中融化了.',
      iceMeltInHole: '{0}融化了, 形成水坑.',
      iceMelt: '{0}融化了.',
      iceHitLava: '{0}冷卻了岩漿, 形成可行走的陸地.',
      objectSummoned: '{0}召喚了{1}!',
      pressFloorTriggered: '你聽到機關被觸動的聲音...',
      lavaDamage: '{0}身在滾燙的熔岩中, 受到了{1}點傷害!',
      auraEnabled: '{0}的身邊能量湧動, 出現了一個{1}!',
      auraDisabled: '{0}散去了身旁的{1}.',
      auraOutOfEnergy: '{0}沒有足夠的能量維持{1}...',
      auraDamage: '{0}身旁的{1}對{2}造成{3}點傷害!',
      terrainDamage: '{0}受到{1}點{2}傷害.',
      firePathEnabled: '{0}的腳下出現了一團火焰!',
      firePathDisabled: '{0}腳下的火焰熄滅了.',
      charging: '{0}正在蓄力!',
      tutorialGuide: '艾比',
      tutorialMove1:
        '你好, 初次見面! 我是負責在遊戲進行中從旁進行提示教學的精'
      + '靈, 請多指教～',
      tutorialMove2:
        '當遊戲進展到相關的操作指令時, 我就會跳出來提醒你哦! 到時'
      + '候可要記好了...',
      tutorialMove3:
        '在地圖上有8個方向可以移動, 分別是上、下、左、右、左上、'
      + '左下、右上、右下, 對應到數字小鍵盤的8、2、4、6、7、1、9'
      + '、3.',
      tutorialMove4:
        '如果沒有數字小鍵盤, 則可以用方向鍵的上、下、左、右, 再加'
      + '上Home、End、PgUp、PgDn來代替.',
      tutorialMove5:
        '在遊戲中, 玩家角色前進一格, 時間才會跟著流逝一回合, 所以'
      + '前進的時候是一次次的按下方向鍵, 盡量不要按著不放, 否則容'
      + '易不知道發生了什麼事情哦!',
      tutorialMove6:
        '其中數字小鍵盤的5, 或是符號"."可以讓角色原地休息一回合. '
      + '隨著時間過去, 角色的狀態也會慢慢回復, 在角色虛弱的時候非'
      + '常重要!',
      tutorialMove7:
        '按下按鍵"h"或是"?"就可以查看所有操作指令的說明, 如果忘記'
      + '的時候記得打開說明欄複習一下!',
      tutorialMove8:
        '現在就開始在地下城中走走看看吧!',
      tutorialMeleeAttack0:
        '遇到敵人了!',
      tutorialMeleeAttack1:
        '在敵人的身邊對著敵人的方向按方向鍵, 就能夠對目標進行普通'
      + '攻擊.',
      tutorialMeleeAttack2:
        '普通攻擊會消耗耐力(EN), 當耐力過低的時候就會無法進行攻擊, '
      + '所以要時刻注意耐力的殘量哦!',
      tutorialMeleeAttack3:
        '耐力在不進行攻擊的時候就會自動回復, 特別是在原地休息的時'
      + '候回復最多. 另外若是需要較強力的攻擊手段, 就選擇施展戰技(W)'
      + '或魔法(C)吧!',
      tutorialGetDrop1:
        '地上發現物品的時候, 物品的名稱會顯示在左下角, 這時候按下'
      + '"g"就可以把地上的物品撿起來哦.',
      tutorialGetDrop2:
        '地上的物品多於1個的時候, 會跳出視窗, 在視窗中選擇要撿起'
      + '的物品按下Enter鍵就能夠撿起. 如果要結束這個動作, 只要按'
      + '下"Esc"或是數字小鍵盤的"0"就能夠取消畫面了.',
      tutorialGetDrop3:
        '"Esc"和數字小鍵盤的"0"都可以作為取消動作的按鍵哦! 此外, '
      + '在平常的畫面按"Esc"或數字小鍵盤的"0"可以開啟主選單.',
      tutorialGetDrop4:
        '如果想要丟下身上的物品, 按下"d"就會顯示出身上攜帶的所有'
      + '物件,選到要丟下的物品按下Enter即可.',
      tutorialInventory1:
        '如果想要查看角色身上攜帶著哪些物品, 可以按下"i"鍵, 就會'
      + '跳出視窗顯示身上擁有的物件, 分為道具/武器/防具三個視窗.',
      tutorialInventory2:
        '需要注意的是, 物品欄視窗只是方便玩家確認身上有哪些東西, '
      + '要使用物品還是需要按下相對應的功能鍵哦!',
      tutorialEquip1:
        '取得裝備之後, 按下"w"就可以開啟裝備介面, 再用方向鍵選擇'
      + '要進行裝備的欄位. 底下的視窗會顯示身上擁有可以裝備在該'
      + '部位的裝備名稱.',
      tutorialEquip2:
        '沒有使用過的裝備是不知道其數值的, 但是一旦裝備上去後就會'
      + '自動鑑定. 之後就可以透過上方的敘述欄位得知裝備所影響的數'
      + '值, 也能夠透過左邊的數值比較來判斷裝備的好壞.',
      tutorialEquip3:
        '值得注意的是, 如果運氣不好裝上了被詛咒的裝備, 可就無法脫'
      + '下來了...這時候就得想辦法去除詛咒, 或是銷毀裝備了呢!',
      tutorialSoul1:
        '擊敗敵人時, 有機會從敵人身上吸收到魂. 魂會讓主角得到相對'
      + '應的技能. 技能分成戰技、魔法、常駐三種類型, 想要確認主角'
      + '擁有哪些技能, 可以按"Esc"或數字小鍵盤的"0"開啟主選單, 並'
      + '且選擇技能頁面.',
      tutorialSoul2:
        '其中戰技是主要消耗耐力(EN)的技能, 透過"W"來施展; 魔法則'
      + '是主要消耗魔力(MP)的技能, 透過"C"來施展; 常駐技能不能主'
      + '動施展, 但是會持續影響角色的狀態. (按鍵有大小寫之分!)',
      tutorialSoul3:
        '主動技能分為範圍、指向、投射三種類型. 範圍技能在施展的當'
      + '下隨即生效, 效果持續一段時間; 指向技能在施展後需要指定方'
      + '向, 通常只對身邊一格距離生效; 投射技能則會放出飛行的投射'
      + '物, 能夠對較遠距離的敵人進行攻擊.',
      tutorialSoul4:
        '技能的等級會隨著使用的次數提升, 技能威力和距離都有可能隨'
      + '之增加, 所以密集使用想培養的技能吧!',
      tutorialSoul5:
        '除了可以在主選單確認擁有的技能之外, 也能夠在物品欄確認擁'
      + '有的魂的種類.',
      tutorialDoor0:
        '前方出現了一道門!',
      tutorialDoor1:
        '關上的門可以透過"o"或是直接往門的方向前進來打開. 反之如果'
      + '要關上門的話, 就要透過"c"指令.',
      tutorialDoor2:
        '值得注意的是, 如果門的所在位置有敵人, 或是地上有物品的時'
      + '候, 門是關不起來的喔!',
      tutorialSecretDoor0:
        '你身邊的牆壁存在隱藏門!',
      tutorialSecretDoor1:
        '隱藏門的外觀就和普通牆壁一樣, 但是只要經過數次的搜查, 就有'
      + '可能發現它們. 搜查的方式是"s". 並且因為單次尋找就找到隱藏'
      + '門的機率不高, 因此最好是多按幾次哦!',
      tutorialSecretDoor2:
        '當迷宮中找不到出路的時候, 就肯定在哪邊的牆壁存在隱藏門, '
      + '這時後就需要耐心沿著牆壁找找看了.',
      tutorialSecretDoor3:
        '使用指令"k"可以嘗試踹向一面牆, 檢查是否存在隱藏門, 但是'
      + '若猜錯的話, 不但會受傷, 還有可能進入腳傷的狀態. 腳傷時'
      + '會大幅減低行動速度, 因此踹牆前需小心評估.',
      tutorialTrap1:
        '陷阱在地圖上是隱藏的, 一直到有生物踩到它之後才會顯示出來. '
      + '陷阱有著多樣性的負面效果, 有的會讓角色受傷, 也有的會讓角'
      + '色不能動彈.',
      tutorialTrap2:
        '你可以透過"s"來搜查自己身邊的地板上是否有陷阱. 因為單次'
      + '搜查就找到的機率不高, 最好是多搜查幾回合哦! 當角色狀態危'
      + '險的時候, 就小心的一邊搜查陷阱一邊前進吧.',
      tutorialLog0:
        '你擊敗敵人了!',
      tutorialLog1:
        '在戰鬥的時候的各種招式和傷害數值都會被記錄在歷史訊息中, '
      + '按"/"就可以查看. 除了戰鬥之外, 一些比較重要的訊息也會記'
      + '錄在其中, 比方說踩到陷阱、撿拾物品等.',
      tutorialLog2:
        '歷史訊息只能夠保留有限的長度, 超過長度的則會刪除, 這點可'
      + '以稍微注意一下. 當局面混亂, 不知道發生什麼事情的時候, 最'
      + '好打開歷史訊息看看哦!',
      tutorialScroll0:
        '你拿到了一捲卷軸.',
      tutorialScroll1:
        '卷軸在閱讀前無法得知其魔法效果. 若閱讀時不滿足發動效果的'
      + '環境, 也不會得知其效果. 然而一旦成功發動卷軸效果後, 以後'
      + '再拿到相同的卷軸就會顯示看得懂的名稱.',
      tutorialScroll2:
        '卷軸的名稱在每一局遊戲都會亂數產生, 因此記住未鑑定前的名'
      + '稱並沒有意義哦! 按"r"可以對身上擁有的卷軸進行閱讀.',
      tutorialPotion0:
        '你拿到了一瓶藥水.',
      tutorialPotion1:
        '藥水可以給角色飲用, 也可以拿來投擲敵人. 按"q"可以選擇身上'
      + '的藥水來飲用, 按"f"則能夠選擇將藥水向某個方向丟出. 被丟中'
      + '的對象會獲得等同於飲用藥水的效果.',
      tutorialPotion2:
        '藥水要經過使用才知道其效果, 之後拿到同樣種類的藥水都會直'
      + '接顯示名稱. 藥水的種類在每一局的遊戲都是打亂的, 所以記住'
      + '未鑑定前的名稱並沒有意義哦!',
      tutorialStair0:
        '你發現了往下的樓梯!',
      tutorialStair1:
        '站在樓梯上按下">"就能夠往下走, 反之若是站在往上的樓梯上'
      + '按下"<"可以往上走. 除了使用這兩個按鍵之外, 只要站在樓梯'
      + '上按下Enter鍵也能夠使用樓梯.',
      tutorialStair2:
        '地城隨著越往地下深入, 所遭遇到的敵人也會更加困難, 因此好'
      + '好的準備, 不要貿然前進! 在地城中除了遇到最上或最底層的狀'
      + '況, 否則每一層地圖都至少會擁有一個向上的樓梯和一個向下的'
      + '樓梯.',
      tutorialStair3:
        '當找不到樓梯的時候, 很有可能是某個隱藏通道沒有被發現喔! '
      + '多嘗試找找看可疑的牆壁吧!',
      tutorialBelly0:
        '你撿到食物了!',
      tutorialBelly1:
        '在遊戲中, 必須不斷進食才能確保不餓死. 有些食物是有保存期'
      + '限的, 過一段時間後會腐爛, 導致食用的時候出現一些負面效果'
      + ', 有一些食物則可以長久保存.',
      tutorialBelly2:
        '按下"e"可以對身上或地上的食物進行食用. 特別注意吃東西的'
      + '時候, 時間會迅速的流逝, 要小心這段期間被敵人攻擊喔!',
      tutorialMix0:
        '你撿到素材了!',
      tutorialMix1:
        '在遊戲中可以使用敵人掉落的素材來製作出裝備, 在遊戲進行過'
      + '程中是不可或缺的. 按"M"可以進入合成頁面, 根據自己獲得的'
      + '素材, 時常檢查可以進行合成的項目吧!',
      tutorialDart0:
        '你撿到飛鏢了!',
      tutorialDart1:
        '飛鏢可以用"f"向敵人投擲出去, 造成遠程物理傷害. 飛鏢可以'
      + '使用合成製造, 投擲後有一定的機率會損壞. 在不想靠近敵人的'
      + '時候多多使用吧.',
      tutorialDart2:
        '此外, 透過快捷鍵"Q"可以在投射物的清單內設定預設投射物品.'
      + '再次選擇預設投射物則可取消此功能.',
      tutorialSave1:
        '長期進行遊戲是否感到疲倦呢? 這個遊戲是可以隨時存檔的哦! '
      + '可以從主選單選擇存檔動作, 或者按"S"叫出存檔頁面, 關閉遊'
      + '戲前記得保存自己的遊玩記錄哦.',
      tutorialCarry0:
        '你進入負重狀態了!',
      tutorialCarry1:
        '任何物品都有重量, 隨著身上的物品越來越多, 角色的狀態也會'
      + '因為身上的重量而受影響哦. 謹慎的評估身上要攜帶的物品, 並'
      + '盡量避免太高的負重吧.',
      tutorialHotKey1:
        '每次要施展招式時都要打開戰技或魔法頁面的話, 操作將會變得'
      + '十分繁瑣, 因此本遊戲支援快捷鍵系統.',
      tutorialHotKey2:
        '打開戰技或魔法頁面, 在技能上按下鍵盤左側數字鍵0~9, 便可'
      + '將該技能設定至該數字, 接著在地圖畫面上按下該數字便可以直'
      + '接施放技能. 在選定的技能上再按一次快捷鍵可取消綁定.',
      tutorialHotKey3:
        '熟練快捷鍵的使用, 將會使遊戲流暢度大大提升.',
      tutorialWeapon1:
        '你撿到可以作為武器的素材了!',
      tutorialWeapon2:
        '素材可以直接握在手上當作武器, 也可以透過合成變成更進階的'
      + '兵器. 目前遊戲中的合成武器有刀、槍、杖三種, 也存在其對應'
      + '的武器熟練度. 空手或者拿素材當武器的情況則歸類於武術.',
      tutorialWeapon3:
        '刀能夠機率造成敵人出血; 槍能夠透過"F"指令攻擊'
      + '1格外的敵人, 並機率造成破甲; 杖能夠在裝備時減低魔力的消耗, '
      + '武器等級越高能夠擁有越高的減免比率; 武術則能夠機率擊退敵人.',
      tutorialWeapon4:
        '武器的熟練度累積是透過直接攻擊敵人, 不包括使用戰技. 杖比較特殊, '
      + '在消耗魔力的同時也能夠累積熟練度. 更高的武器熟練度能夠增強攻擊力'
      + '或是提高杖的MP減免比率, 根據自己的戰鬥風格選擇合適的武器吧!',
      helpMsg: '移動角色:\n'
        + '數字小鍵盤(2468: 下左右上, 1379: 左下、右下、左上、\n'
        + '右上, 5:原地等待一回合)\n'
        + '或是使用方向鍵下左右上、End、PgDn、Home、PgUp\n\n'
        + '戰鬥操作: (按鍵有大小寫之分)\n'
        + '對著目標按移動鍵: 普通攻擊  W: 發動戰技  C: 施放魔法\n'
        + 'F: 選擇方向進行普通攻擊  f: 投擲物品  Q: 預設投射物\n\n'
        + '其他操作:\n'
        + '>: 向下走一層    <: 向上走一層    Enter: 走樓梯快捷鍵\n'
        + 'i: 查看物品欄    g: 撿起地上物品  d: 丟下身上物品\n'
        + 'o: 開門         c: 關門         w: 穿脫裝備\n'
        + 'e: 吃東西        /: 查看紀錄     r: 閱讀卷軸\n'
        + 'q: 飲用藥水      M: 合成物品     s: 搜尋隱藏門、陷阱\n'
        + 'S: 存檔頁面      k: 用腳踹       h/?: 開啟此頁面\n'
        + 'x/Esc/數字小鍵盤0: 取消動作/開啟主菜單\n\n'
        + '技能快捷鍵:\n'
        + '鍵盤左側數字0~9',
      easyMsg:
        '適合第一次接觸Roguelike遊戲的玩家, 以體驗遊戲玩法、流程為\n'
      + '主.\n\n'
      + '- 擁有額外的護甲強度&魔法抗性\n'
      + '- 飢餓速度減緩40%\n'
      + '- 獲得經驗值提升40%\n'
      + '- 魂的掉落率增加50%\n'
      + '- 敵人不會隨探索地圖數量逐步變強',
      normalMsg:
        '適合對Roguelike遊戲有基礎認識的玩家, 透過慎重的遊玩以及對\n'
      + '角色的培養, 就能夠穩妥的過關.',
      hardMsg:
        '適合熟悉此遊戲的玩家, 更具有挑戰性.\n\n'
      + '- 護甲強度&魔法抗性降低20%\n'
      + '- 獲得經驗值降低20%\n'
      + '- 關卡頭目擁有更高的HP&MP\n',
      extremeMsg:
        '適合追求極限挑戰與刺激的玩家遊玩.\n\n'
        + '- 護甲強度&魔法抗性降低20%\n'
        + '- 獲得經驗值降低20%\n'
        + '- 關卡頭目擁有更高的HP&MP\n'
        + '- 敵人隨遊戲回合逐步加強\n'
        + '- 敵人數量更多, 素材掉落機率同步降低\n'
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
  CharUtils.mobTemplates = [
    [], [], [] // 0: earth, 1: ice, 2: fire
  ]; // save all mobs

  CharUtils.baseHp = 35;

  // initialize character status map
  CharUtils.initStatus = function() {
    var result = {
      blindEffect: new StatusEffect(),
      paralyzeEffect: new StatusEffect(),
      sleepEffect: new StatusEffect(),
      poisonEffect: new StatusEffect(),
      speedUpEffect: new StatusEffect(),
      invisibleEffect: new StatusEffect(),
      seeInvisibleEffect: new StatusEffect(),
      afraidEffect: new StatusEffect(),
      bleedingEffect: new StatusEffect(),
      faintEffect: new StatusEffect(),
      breakArmorEffect: new StatusEffect(),
      wetEffect: new StatusEffect(),
      auraFireEffect: new StatusEffect(),
      legWoundedEffect: new StatusEffect(),
      groundHoleTrapped: false,
      skillEffect: [],
      bellyStatus: 'NORMAL', // FAINT, WEAK, HUNGRY, NORMAL, FULL
      resistance: new ResistanceData(),
      damageType: new ResistanceData()
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

  CharUtils.updateStatus = function(event, statusName, skillEffect) {
    let target = BattleUtils.getRealTarget(event);
    // for (let id in target.status) {
    if (statusName) {
      if (target.status[statusName].turns && target.status[statusName].turns > 0) {
        target.status[statusName].turns--;
        target.status[statusName].lastTime = $gameVariables[0].gameTime;
        if (statusName == 'poisonEffect') {
          let value = 3;
          CharUtils.decreaseHp(target, value);
          if (MapDataUtils.getVisible($gameVariables[$gameMap.mapId()].mapData[event._x][event._y])) {
            TimeUtils.animeQueue.push(new AnimeObject(event, 'POP_UP', -1 * value));
            LogUtils.addLog(String.format(Message.display('poisonDamage'), LogUtils.getCharName(target)
              , value));
          }
          BattleUtils.checkTargetAlive(null, target, event);
        } else if (statusName == 'bleedingEffect') {
          let value = Math.round(target.mhp / 100);
          value = (value < 1) ? 1 : value;
          CharUtils.decreaseHp(target, value);
          if (MapDataUtils.getVisible($gameVariables[$gameMap.mapId()].mapData[event._x][event._y])) {
            TimeUtils.animeQueue.push(new AnimeObject(event, 'POP_UP', -1 * value));
            LogUtils.addLog(String.format(Message.display('bleedingDamage'), LogUtils.getCharName(target)
              , value));
          }
          BattleUtils.checkTargetAlive(null, target, event);
        }
        if (target.status[statusName].turns == 0
          && (event == $gamePlayer || MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[event._x][event._y]))) {
          switch (statusName) {
            case 'afraidEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromAfraid')
                , LogUtils.getCharName(target)));
              break;
            case 'blindEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromBlind')
                , LogUtils.getCharName(target)));
              if (event == $gamePlayer) {
                $gameActors.actor(1).awareDistance = $gameActors.actor(1).originalAwareDistance;
              }
              break;
            case 'paralyzeEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromParalyze')
                , LogUtils.getCharName(target)));
              break;
            case 'sleepEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromSleep')
                , LogUtils.getCharName(target)));
              break;
            case 'speedUpEffect':
              LogUtils.addLog(String.format(Message.display('speedUpEnd')
                , LogUtils.getCharName(target)));
              break;
            case 'invisibleEffect':
              LogUtils.addLog(String.format(Message.display('invisibleEnd')
                , LogUtils.getCharName(target)));
              if (event == $gamePlayer) {
                $gamePlayer.setOpacity(255);
              }
              break;
            case 'seeInvisibleEffect':
              LogUtils.addLog(String.format(Message.display('seeInvisibleEnd')
                , LogUtils.getCharName(target)));
              break;
            case 'poisonEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromPoison')
                , LogUtils.getCharName(target)));
              break;
            case 'faintEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromFaint')
                , LogUtils.getCharName(target)));
              break;
            case 'bleedingEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromBleeding')
                , LogUtils.getCharName(target)));
              break;
            case 'breakArmorEffect':
              LogUtils.addLog(String.format(Message.display('breakArmorRecovered')
                , LogUtils.getCharName(target)));
              break;
            case 'wetEffect':
              LogUtils.addLog(String.format(Message.display('recoverFromWet')
                , LogUtils.getCharName(target)));
              break;
            case 'legWoundedEffect':
              LogUtils.addLog(Message.display('recoverFromLegWounded'));
              break;
          }
        }
      }
    } else if (skillEffect) {
      // check aura effect
      if (skillEffect instanceof SkillEffect_Aura) {
        let skill = skillEffect.skill;
        let realSrc = skillEffect.realSrc;
        if (realSrc._mp < realSrc.skillMpCost(skill) || realSrc._tp < realSrc.skillTpCost(skill)) {
          AudioManager.playSe({name: "Down2", pan: 0, pitch: 100, volume: 100});
          LogUtils.addLog(String.format(Message.display('auraOutOfEnergy'), LogUtils.getCharName(realSrc)
            , skill.name));
          skillEffect.effectCount = 0;
        } else {
          // FirePath no need to display event
          if (skillEffect.eventClassName) {
            // check & created aura map event
            let evts = $gameMap.eventsXy(event._x, event._y).filter(function(evt) {
              return evt.type == 'AURA';
            });
            if (!evts[0]) {
              let auraEvent = new window[skillEffect.eventClassName](event._x, event._y);
              auraEvent.caster = event;
            }
          }

          realSrc.paySkillCost(skill);
          skillEffect.auraEffect();
        }
        SkillUtils.gainSkillExp(realSrc, skill, SkillUtils.getWarSkillLevelUpExp(skill.lv));
      } else {
        // update skill effects
        skillEffect.effectCount--;
      }
      skillEffect.lastTime = $gameVariables[0].gameTime;
      // check effect ends
      if (skillEffect.effectCount == 0) {
        if (CharUtils.playerCanSeeChar(event)) {
          LogUtils.addLog(String.format(Message.display('skillEffectEnd'), LogUtils.getCharName(target)
            , skillEffect.skill.name));
        }
        skillEffect.effectEnd();
        target.status.skillEffect.splice(target.status.skillEffect.indexOf(skillEffect), 1);
      }
    }
  }

  CharUtils.updatesleepEffectWhenHit = function(target) {
    if (target.status.sleepEffect.turns > 0 && target.status.sleepEffect.turns <= 15) {
      // wake up when hit
      target.status.sleepEffect.turns = 0;
      LogUtils.addLog(String.format(Message.display('recoverFromSleep')
        , LogUtils.getCharName(target)));
    }
  }

  CharUtils.getActionTime = function(realTarget) {
    let result = Math.ceil(100 / realTarget.param(6) + 10);
    if (realTarget.status.speedUpEffect.turns > 0) {
      result = Math.ceil(result / 2);
    }
    return result;
  }

  CharUtils.levelUp = function(target) {
    target._paramPlus[0] += 3 + Math.round(target.param(3) / 2);
    target._paramPlus[1] += 2 + Math.round(target.param(5) / 2);
  }

  // now checks both water & lava
  CharUtils.isCharInWater = function(target) {
    if (target._x < 0 || target._y < 0) {
      return false;
    }
    let realTarget = BattleUtils.getRealTarget(target);
    if ((MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[target._x][target._y]) == WATER
      || MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[target._x][target._y]) == LAVA)
      && realTarget.moveType != 2) {
      return true;
    }
    return false;
  }

  CharUtils.canSee = function(src, target) {
    let srcEvt = BattleUtils.getEventFromCharacter(src);
    let targetEvt = BattleUtils.getEventFromCharacter(target);

    if (src.status.blindEffect.turns > 0) {
      return false;
    } else if (target.status.invisibleEffect.turns > 0 && src.status.seeInvisibleEffect.turns == 0) {
      return false;
    } else if (srcEvt == $gamePlayer 
      && CharUtils.isCharInWater(targetEvt)) {
      // check if player in the same water area
      if (CharUtils.isCharInWater(srcEvt)) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  }

  CharUtils.playerCanSeeItemPile = function(event) {
    if (event._x < 0 || event._y < 0 || $gamePlayer._x < 0 || $gamePlayer._y < 0) {
      return false;
    }
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    if (MapDataUtils.getOriginalTile(mapData[event._x][event._y]) == WATER
      && MapDataUtils.getOriginalTile(mapData[$gamePlayer._x][$gamePlayer._y]) != WATER) {
      return false;
    }
    return true;
  }

  CharUtils.playerCanSeeChar = function(target) {
    if (target == $gamePlayer) {
      return true;
    } else if (MapDataUtils.getVisible($gameVariables[$gameMap.mapId()].mapData[target._x][target._y])
      && CharUtils.canSee($gameActors.actor(1), BattleUtils.getRealTarget(target))) {
      return true;
    }
    return false;
  }

  CharUtils.playerCanSeeBlock = function(x, y) {
    if (x < 0 || y < 0) {
      return false;
    }
    return MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[x][y])
      && $gameActors.actor(1).status.blindEffect.turns == 0;
  }

  CharUtils.updateHpMp = function(target) {
    // setup HP & MP
    target._hp = Math.round(CharUtils.baseHp + 3 * target.level + (1 + target.param(3) / 2) * target.level / 2);
    target._paramPlus[0] = target._hp - target.param(0);
    target._mp = Math.round(CharUtils.baseHp + 2 * target.level + (1 + target.param(5) / 2) * target.level / 2);
    target._paramPlus[1] = target._mp - target.param(1);
  }

  CharUtils.regenerate = function(target) {
    let realTarget = BattleUtils.getRealTarget(target);
    if (realTarget.carryStatus > 2) {
      // carry too much, not gonna regenerate
      return;
    }
    // regenerate HP
    var regenValue = Math.round(1 + realTarget.param(3) / 3);
    regenValue = getRandomIntRange(1, regenValue);
    realTarget.gainHp(regenValue);

    // regenerate MP
    regenValue = Math.round(1 + realTarget.param(5) / 3);
    regenValue = getRandomIntRange(1, regenValue);
    realTarget.gainMp(regenValue);
  }

  CharUtils.regenerateTp = function(target) {
    let realTarget = BattleUtils.getRealTarget(target);
    let tpRecover = 0;
    if (realTarget.attacked) {
      // huge movement, do nothing
    } else if (realTarget.moved) {
      tpRecover = walkTpRecover;
    } else {
      // target rest
      tpRecover = restTpRecover;
    }
    // check status effect
    if (realTarget.status.wetEffect.turns > 0) {
      // check if adapts water
      let skill = SkillUtils.getSkillInstance(realTarget, Skill_AdaptWater);
      if (!skill || skill.lv < 3) {
        tpRecover = Math.round(tpRecover / 2);
      }
    }
    switch (realTarget.carryStatus) {
      case 1:
        tpRecover -= 1;
        break;
      case 2:
        tpRecover -= 2;
        break;
      case 3: case 4:
        tpRecover -= 3;
        break;
    }
    tpRecover = (tpRecover < 0) ? 0: tpRecover;
    realTarget.gainTp(tpRecover);
  }

  CharUtils.calcMobAppearPercentage = function(mobLevel, dungeonLevel) {
    let result = 0;
    if (mobLevel > dungeonLevel) {
      if (mobLevel - dungeonLevel <= 3) {
        result = Math.pow(0.5, mobLevel - dungeonLevel);
      }
    } else {
      result = 1 - (dungeonLevel - mobLevel) * 10 / 100;
    }
    return result;
  }

  CharUtils.calcMobSpawnLevel = function(mobClass) {
    let dungeonType = 0; // EARTH
    for(let i = 1; i < CharUtils.mobTemplates.length; i++) {
      if (CharUtils.mobTemplates[i].includes(mobClass)) {
        dungeonType = i;
        break;
      }
    }
    let delta = 0;
    if (dungeonType != 0) {
      // minus 5 because sub dungeon mobs level start from 5 for now
      delta = $gameVariables[0].dungeonEntranceLevel[dungeonType] - 5;
    }
    return mobClass.mobInitData.level + delta;
  }

  CharUtils.getMobPools = function(mapId) {
    let mapType = $gameVariables[mapId].mapType;
    let dungeonLevel = $gameVariables[mapId].dungeonLevel;
    let pool = [], mapTypeIndex = MapUtils.getMapTypeIndex(mapType);
    let mobTypeIndicator = mapTypeIndex;
    do {
      if (getRandomInt(100) / 100 > genLocalDungeonObjectPercentage) {
        // creature from other dungeons
        let temp;
        do {
          temp = getRandomInt(CharUtils.mobTemplates.length);
        } while (temp == mapTypeIndex);
        mobTypeIndicator = temp;
      }
      for (let id in CharUtils.mobTemplates[mobTypeIndicator]) {
        let mobClass = CharUtils.mobTemplates[mobTypeIndicator][id];
        let spawnPercentage = CharUtils.calcMobAppearPercentage(mobClass.mobInitData.level, dungeonLevel);
        if (spawnPercentage > 0) {
          pool.push(new SpawnMobData(mobClass, spawnPercentage));
        }
      }
      if (pool.length == 0 && mobTypeIndicator != mapTypeIndex) {
        // recalculate: use local dungeon creature
        for (let id in CharUtils.mobTemplates[mapTypeIndex]) {
          let mobClass = CharUtils.mobTemplates[mapTypeIndex][id];
          let spawnPercentage = CharUtils.calcMobAppearPercentage(mobClass.mobInitData.level, dungeonLevel);
          if (spawnPercentage > 0) {
            pool.push(new SpawnMobData(mobClass, spawnPercentage));
          }
        }
      }
    } while (pool.length == 0);
    // sort & normalize percentage
    pool.sort(function(a, b) {
      return b.percentage - a.percentage;
    });
    let denominator = 0;
    for (let id in pool) {
      denominator += pool[id].percentage;
    }
    let indicator = 1;
    for (let id in pool) {
      pool[id].percentage = indicator - pool[id].percentage / denominator;
      indicator = pool[id].percentage;
    }
    return pool;
  }

  CharUtils.chooseMobClassFromPool = function(mobClassPool) {
    let randNum = Math.random();
    for (let i = 0; i < mobClassPool.length; i++) {
      if (mobClassPool[i].percentage < randNum) {
        return mobClassPool[i].mobClass;
      }
    }
    // should not happen
    throw 'Can not find available mobClass!';
  }

  CharUtils.spawnMob = function(mapId, mapBlocks, outOfSight, mobClassInput) {
    let pool = CharUtils.getMobPools(mapId);
    while (true) {
      let mobClass = (mobClassInput) ? mobClassInput : CharUtils.chooseMobClassFromPool(pool);
      let locations = [];
      switch (mobClass.mobInitData.moveType) {
        case 0:
          locations = mapBlocks.floor;
          break;
        case 1:
          locations = mapBlocks.water;
          break;
        case 2:
          locations = mapBlocks.floor.concat(mapBlocks.hollow);
          break;
      }
      if (locations.length > 0) {
        let maxTry = 20;
        let location, temp;
        for (let i = 0; i < maxTry; i++) {
          temp = locations[getRandomInt(locations.length)];
          if (!MapUtils.isTileAvailableForMob(mapId, MapDataUtils.getX(temp), MapDataUtils.getY(temp))) {
            continue;
          } else if (outOfSight && MapDataUtils.getVisible(temp)) {
            continue;
          } else {
            location = temp;
            break;
          }
        }
        if (location) {
          return new mobClass(MapDataUtils.getX(location), MapDataUtils.getY(location), null);
        } else {
          console.log('can not find location out of sight!');
        }
      } else {
        console.log('no place to spawn mob: ' + mobClass.name);
      }
    }
  }

  CharUtils.spawnMobXy = function(mapId, x, y) {
    let pool = CharUtils.getMobPools(mapId);
    let tileType = MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y]);
    let candidates = [];
    do {
      for (let id in pool) {
        let toCheck = pool[id].mobClass;
        let moveType = toCheck.mobInitData.moveType;
        switch (tileType) {
          case WATER:
            candidates.push(toCheck);
            break;
          case HOLLOW: case LAVA:
            if (moveType == 2) {
              candidates.push(toCheck);
            }
            break;
          default:
            if (moveType != 1) {
              candidates.push(toCheck);
            }
            break;
        }
      }
    } while (candidates.length == 0);
    let mobClass = candidates[getRandomInt(candidates.length)];
    return new mobClass(x, y, null);
  }

  CharUtils.spawnMobNearPlayer = function(mobType, xOffset, yOffset) {
    return new mobType($gamePlayer._x + xOffset, $gamePlayer._y + yOffset, null
      , mobType.mobInitData.level);
  }

  // for distance attack
  CharUtils.checkTargetReachable = function(src, target, penetrateFlag) {
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
      , $gameVariables[$gameMap.mapId()].mapData, !penetrateFlag, true)) {
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
    let multiplier = 1;
    // check difficulty effect
    if (isPlayer && $gameVariables[0].difficulty == 'EASY') {
      multiplier = 0.6;
    }

    realTarget.nutrition -= multiplier;
    switch (realTarget.carryStatus) {
      case 2:
        realTarget.nutrition -= 0.5 * multiplier;
        break;
      case 3: case 4:
        realTarget.nutrition -= multiplier;
        break;
    }
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
      if (getRandomInt(100) < 20 && realTarget.status.faintEffect.turns == 0) {
        if (isPlayer) {
          LogUtils.addLog(String.format(Message.display('faint'), LogUtils.getCharName(realTarget)));
        }
        realTarget.status.faintEffect.turns = dice(1, 5);
        TimeUtils.eventScheduler.addStatusEffect(target, 'faintEffect');
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
      TimeUtils.tutorialHandler.msg += msg + '\n';
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainVitExp = function(value) {
    $gameVariables[0].paramsExperience.vit += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.vit >= $gameActors.actor(1)._hp + $gameActors.actor(1)._paramPlus[3] * 5) {
      $gameActors.actor(1)._paramPlus[3]++;
      $gameVariables[0].paramsExperience.vit = 0;
      let msg = Message.display('vitUp');
      TimeUtils.tutorialHandler.msg += msg + '\n';
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainIntExp = function(value) {
    $gameVariables[0].paramsExperience.int += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.int >= 10 + $gameActors.actor(1)._paramPlus[4] * 2) {
      $gameActors.actor(1)._paramPlus[4]++;
      $gameVariables[0].paramsExperience.int = 0;
      let msg = Message.display('intUp');
      TimeUtils.tutorialHandler.msg += msg + '\n';
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainWisExp = function(value) {
    $gameVariables[0].paramsExperience.wis += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.wis >= $gameActors.actor(1)._mp + $gameActors.actor(1)._paramPlus[5] * 5) {
      $gameActors.actor(1)._paramPlus[5]++;
      $gameVariables[0].paramsExperience.wis = 0;
      let msg = Message.display('wisUp');
      TimeUtils.tutorialHandler.msg += msg + '\n';
      LogUtils.addLog(msg);
    }
  }

  CharUtils.playerGainAgiExp = function(value) {
    $gameVariables[0].paramsExperience.agi += Soul_Chick.expAfterAmplify(value);
    if ($gameVariables[0].paramsExperience.agi >= 200 + $gameActors.actor(1)._paramPlus[6] * 10) {
      $gameActors.actor(1)._paramPlus[6]++;
      $gameVariables[0].paramsExperience.agi = 0;
      let msg = Message.display('agiUp');
      TimeUtils.tutorialHandler.msg += msg + '\n';
      LogUtils.addLog(msg);
    }
  }

  CharUtils.calcMobExp = function(realTarget) {
    let exp = Math.pow(realTarget.level, 2) + 1;
    let paramSum = 0;
    for (let i = 2; i < 8; i++) {
      paramSum += realTarget._params[i];
    }
    exp += Math.round(paramSum / 10);
    exp += realTarget._skills.length;
    return exp;
  }

  CharUtils.calcCapacity = function(realTarget) {
    return 10 * (realTarget.param(2) + realTarget.param(3)) + 50;
  }

  CharUtils.getPlayerCarryWeight = function() {
    let inventory = $gameParty.allItems();
    let result = 0;
    for (let id in inventory) {
      result += inventory[id].weight;
    }
    for (let id in $gameActors.actor(1)._equips) {
      let item = $gameActors.actor(1)._equips[id]._item;
      if (item) {
        result += item.weight;
      }
    }
    return result;
  }

  CharUtils.calcPlayerCarryStatus = function() {
    let capacity = CharUtils.calcCapacity($gameActors.actor(1));
    let weight = CharUtils.getPlayerCarryWeight();
    if (weight <= capacity) { // normal
      switch ($gameActors.actor(1).carryStatus) {
        case 1: case 2: case 3: case 4:
          LogUtils.addLog(Message.display('carryDownToNormal'));
          break;
      }
      $gameActors.actor(1).carryStatus = 0;
    } else if (capacity < weight && weight <= capacity * 1.5) { // burdened
      switch ($gameActors.actor(1).carryStatus) {
        case 0:
          LogUtils.addLog(Message.display('carryUpToBurdened'));
          break;
        case 2: case 3: case 4:
          LogUtils.addLog(Message.display('carryDownToBurdened'));
          break;
      }
      $gameActors.actor(1).carryStatus = 1;
    } else if (capacity * 1.5 < weight && weight <= capacity * 2) { // strained
      switch ($gameActors.actor(1).carryStatus) {
        case 0: case 1:
          LogUtils.addLog(Message.display('carryUpToStressed'));
          break;
        case 3: case 4:
          LogUtils.addLog(Message.display('carryDownToStressed'));
          break;
      }
      $gameActors.actor(1).carryStatus = 2;
    } else if (capacity * 2 < weight && weight <= capacity * 3) { // overloaded
      switch ($gameActors.actor(1).carryStatus) {
        case 0: case 1: case 2:
          LogUtils.addLog(Message.display('carryUpToStrained'));
          break;
        case 4:
          LogUtils.addLog(Message.display('carryDownToStrained'));
          break;
      }
      $gameActors.actor(1).carryStatus = 3;
    } else {
      switch ($gameActors.actor(1).carryStatus) {
        case 0: case 1: case 2: case 3:
          LogUtils.addLog(Message.display('carryUpToOverloaded'));
          break;
      }
      $gameActors.actor(1).carryStatus = 4;
    }
    if ($gameActors.actor(1).carryStatus > 0) {
      // tutorial: carry
      TimeUtils.tutorialHandler.queue.push('carry');
    }
    // check carryStatus effect
    let damage;
    switch ($gameActors.actor(1).carryStatus) {
      case 2:
        if (getRandomInt(10) < 2) {
          damage = dice(1, 5);
        }
        break;
      case 3:
        if (getRandomInt(10) < 4) {
          damage = dice(1, 5);
        }
        break;
      case 4:
        if (getRandomInt(10) < 8) {
          damage = dice(1, 5);
        }
        break;
    }
    if (damage) {
      AudioManager.playSe({name: 'Knock', pan: 0, pitch: 100, volume: 100});
      TimeUtils.animeQueue.push(new AnimeObject($gamePlayer, 'POP_UP', -1 * damage));
      LogUtils.addLog(String.format(Message.display('damageFromCarryTooMuch'), damage));
      CharUtils.decreaseHp($gameActors.actor(1), damage);
      BattleUtils.checkTargetAlive(null, $gameActors.actor(1), $gamePlayer);
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
    for (let i = 0; i < 40; i++) {
      $gameVariables[i + 1] = new MapVariable(null, null, 'EARTH');
    }
    for (let i = 1; i < 40; i++) {
      $gameVariables[i + 1].generateRandom = true;
      $gameVariables[i + 1].dungeonLevel = i;
      $gameVariables[i + 1].bgm = 'Dungeon1';
    }
    $gameVariables[1].stairUpNum = 0;
    $gameVariables[1].stairToList.push(2);
    for (let i = 2; i < dungeonDepth; i++) {
      // push up, then down
      $gameVariables[i].stairToList.push(i - 1);
      $gameVariables[i].stairToList.push(i + 1);
    }
    $gameVariables[dungeonDepth].stairToList.push(dungeonDepth - 1);
    $gameVariables[dungeonDepth].stairDownNum = 0;

    // setup final boss layer
    $gameVariables[dungeonDepth].spawnMobs = false;
    $gameVariables[dungeonDepth].spawnItems = false;
    $gameVariables[dungeonDepth].spawnTraps = false;
    let stairUp = new StairData();
    stairUp.x = 10;
    stairUp.y = 16;
    $gameVariables[dungeonDepth].preDefinedStairs.push(stairUp);
    $gameVariables[dungeonDepth].preDefinedMobs.push(new PreDefinedMobData('SealKing', new Coordinate(10, 10)));

    // initialize sub-dungeon levels
    // 0: earth, 1: ice, 2: fire
    $gameVariables[0] = {};
    $gameVariables[0].dungeonEntranceLevel = [0, 0, 0];
    // generate ice entrance
    let dungeonStart = dungeonOffset.ice + 1;
    $gameVariables[0].dungeonEntranceLevel[1] = getRandomIntRange(5, dungeonDepth - 1);
    $gameVariables[$gameVariables[0].dungeonEntranceLevel[1]].stairDownNum++;
    $gameVariables[$gameVariables[0].dungeonEntranceLevel[1]].stairToList.push(dungeonStart);
    $gameVariables[dungeonStart].stairToList.push($gameVariables[0].dungeonEntranceLevel[1]);
    for (let i = dungeonStart; i < dungeonStart + subDungeonDepth; i++) {
      $gameVariables[i].stairToList.push(i - 1);
      $gameVariables[i].stairToList.push(i + 1);
      $gameVariables[i].mapType = 'ICE';
      $gameVariables[i].dungeonLevel = i - dungeonStart + $gameVariables[0].dungeonEntranceLevel[1];
      $gameVariables[i].bgm = 'Dungeon3';
    }
    $gameVariables[dungeonStart].stairToList.splice(1, 1);
    $gameVariables[dungeonStart + subDungeonDepth - 1].stairToList.pop();
    $gameVariables[dungeonStart + subDungeonDepth - 1].stairDownNum = 0;
    $gameVariables[dungeonStart + subDungeonDepth - 1].preDefinedMobs.push(new PreDefinedMobData('Selina'));

    // generate fire entrance
    dungeonStart = dungeonOffset.fire + 1;
    $gameVariables[0].dungeonEntranceLevel[2] = getRandomIntRange(5, dungeonDepth - 1);
    $gameVariables[$gameVariables[0].dungeonEntranceLevel[2]].stairDownNum++;
    $gameVariables[$gameVariables[0].dungeonEntranceLevel[2]].stairToList.push(dungeonStart);
    $gameVariables[dungeonStart].stairToList.push($gameVariables[0].dungeonEntranceLevel[2]);
    for (let i = dungeonStart; i < dungeonStart + subDungeonDepth; i++) {
      $gameVariables[i].stairToList.push(i - 1);
      $gameVariables[i].stairToList.push(i + 1);
      $gameVariables[i].mapType = 'FIRE';
      $gameVariables[i].dungeonLevel = i - dungeonStart + $gameVariables[0].dungeonEntranceLevel[2];
      $gameVariables[i].bgm = 'Dungeon2';
    }
    $gameVariables[dungeonStart].stairToList.splice(1, 1);
    $gameVariables[dungeonStart + subDungeonDepth - 1].stairToList.pop();
    $gameVariables[dungeonStart + subDungeonDepth - 1].stairDownNum = 0;
    $gameVariables[dungeonStart + subDungeonDepth - 1].preDefinedMobs.push(new PreDefinedMobData('FireKing')
      , new Coordinate(9, 3));

    // initialize $gameVariables[0] for multiple usage
    MapUtils.loadMob();
    $gameVariables[0].transferInfo = null;
    $gameVariables[0].directionalAction = null;
    $gameVariables[0].directionalFlag = false;
    $gameVariables[0].messageFlag = false;
    $gameVariables[0].projectileMoving = false;
    $gameVariables[0].logList = []; // only 18 lines can be displayed
    $gameVariables[0].difficulty = 'EASY'; // EASY, NORMAL, HARD, EXTREME
    $gameVariables[0].exploredLayerCount = 0;
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
    $gameActors.actor(1).moveType = 0;
    $gameActors.actor(1).turnCount = 0;
    $gameActors.actor(1).carryStatus = 0; // 0: normal, 1: burdened, 2: stressed, 3: strained, 4: overloaded
    // initialize template events
    $gameVariables[0].templateEvents = {
      monster: 3,
      door: 4,
      projectile: 5,
      itemPile: 6,
      trap: 7,
      goHome: 1,
      bolder: 8,
      aura: 32,
      terrain: 33,
      visitIceDungeon: 9,
      discoverPressFloor: 10,
      selinaEncountered: 11,
      selinaDefeated: 12,
      fireKingEncountered: 34,
      fireKingDefeated: 35,
      visitFireDungeon: 38,
      sealKingEncountered: 36,
      judgementPerformed: 39,
      sealKingDefeated: 37,
      // temp setup
      skillObtainedHint: 31
    }
    $gameVariables[0].skillObtainedHintFlag = false; // set to true for debug purpose
    // tutorial
    $gameVariables[0].tutorialOn = true;
    $gameVariables[0].tutorialEvents = {
      move: new TutorialData(13),
      getDrop: new TutorialData(15),
      inventory: new TutorialData(16),
      meleeAttack: new TutorialData(14),
      soul: new TutorialData(18),
      equip: new TutorialData(17),
      door: new TutorialData(19),
      secretDoor: new TutorialData(20),
      trap: new TutorialData(21),
      log: new TutorialData(22),
      scroll: new TutorialData(23),
      potion: new TutorialData(24),
      stair: new TutorialData(25),
      belly: new TutorialData(26),
      mix: new TutorialData(27),
      dart: new TutorialData(28),
      save: new TutorialData(29),
      carry: new TutorialData(30),
      weapon: new TutorialData(40)
    },
    // define event related states
    $gameVariables[0].eventState = {
      pressFloorDiscovered: false,
      selinaEncountered: false,
      fireKingEncountered: false,
      sealKingEncountered: false,
      judgementPerformed: false
    }
    // define last savefileId
    $gameVariables[0].lastSavefileId = 0;

    // define data images mapping
    $gameVariables[0].itemImageData = generateImageData();

    // define identified data pool
    $gameVariables[0].identifiedObjects = [];

    // temp data for projectile
    $gameVariables[0].fireProjectileInfo = {
      item: null,
      skill: null
    }

    // recognize currentDungeonTiles
    $gameVariables[0].currentDungeonTiles = DungeonTiles.earth;

    // initialize scheduler event queue
    $gameVariables[0].eventQueue = [];

    // initialize player HP & MP
    CharUtils.updateHpMp($gameActors.actor(1));

    // initialize player weapon skills
    for (let i = 0; i < SkillUtils.weaponSkillList.length; i++) {
      let skillClass = SkillUtils.weaponSkillList[i];
      $gameActors.actor(1)._skills.push(new skillClass());
    }

    // initialize hotkeys
    $gameVariables[0].hotkeys = [];
    for (let i = 0; i < 10; i++) {
      $gameVariables[0].hotkeys[i] = null;
    }
    // initialize default projectile, identify by item instance
    $gameVariables[0].defaultProjectile = null;

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

    $gameParty._items.push(new Soul_Bite());
    Soul_Obtained_Action.learnSkill(Skill_Bite);
    // Soul_Obtained_Action.learnSkill(Skill_RockMissile);
    // Soul_Obtained_Action.learnSkill(Skill_RockPierce);
    // Soul_Obtained_Action.learnSkill(Skill_DarkFireBall);
    // Soul_Obtained_Action.learnSkill(Skill_DarkFireBlast);
    // Soul_Obtained_Action.learnSkill(Skill_Judgement);
    // Soul_Obtained_Action.learnSkill(Skill_AuraFire);
    // Soul_Obtained_Action.learnSkill(Skill_FirePath);
    // Soul_Obtained_Action.learnSkill(Skill_FireBall);
    // Soul_Obtained_Action.learnSkill(Skill_FireBreath);
    // Soul_Obtained_Action.learnSkill(Skill_SuperRegen);
    // Soul_Obtained_Action.learnSkill(Skill_AdaptWater);
    // Soul_Obtained_Action.learnSkill(Skill_IceBolt);
    // Soul_Obtained_Action.learnSkill(Skill_IceBreath);
    // Soul_Obtained_Action.learnSkill(Skill_Charge);
    // Soul_Obtained_Action.learnSkill(Skill_IceBolder);
    // Soul_Obtained_Action.learnSkill(Skill_Bash);
    // Soul_Obtained_Action.learnSkill(Skill_Pierce);
    // Soul_Obtained_Action.learnSkill(Skill_Barrier);
    // Soul_Obtained_Action.learnSkill(Skill_Shield);
    // Soul_Obtained_Action.learnSkill(Skill_Acid);
    // Soul_Obtained_Action.learnSkill(Skill_Discharge);
    // Soul_Obtained_Action.learnSkill(Skill_Clever);
    // Soul_Obtained_Action.learnSkill(Skill_Scud);
    // Soul_Obtained_Action.learnSkill(Skill_Roar);
    // Soul_Obtained_Action.learnSkill(Skill_Tough);
    // Soul_Obtained_Action.learnSkill(Skill_Hide);

    // modify actor status
    // let player = $gameActors.actor(1);
    // for (let i = 2; i <= 6; i++) {
    //   player._paramPlus[i] = 10;
    // }
    // for (let i = 0; i < 6; i++) {
    //   player.levelUp();
    // }
    // player._hp = 120;
    // player._mp = 80;

    // $gameParty.gainItem(ItemUtils.createItem(Dog_Shield), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Cat_Gloves), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Wolf_Skin), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Bear_Claw), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Wolf_Shoes), 1);

    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Gloves), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Helmet), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Shield), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Shoes), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Coat), 1);

    // $gameParty.gainItem(ItemUtils.createItem(FireHorse_Shoe), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireHorse_Tail), 1);

    // $gameParty.gainItem(ItemUtils.createItem(Fire_Coat), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Ring_FireResistance), 1);

    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Bone), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Claw), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Tooth), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Skin), 1);

    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Gloves), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Helmet), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Coat), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Shoes), 1);
    // $gameParty.gainItem(ItemUtils.createItem(FireDragon_Shield), 1);

    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Scimitar), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Spear), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Salamander_Staff), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Dart_Fire_T1), 1);
    // $gameParty.gainItem(ItemUtils.createItem(Dart_Fire_T2), 1);

    $gameParty.gainItem(new Cheese(), 1);
    $gameParty.gainItem(new Cheese(), 1);
  }

  MapUtils.loadFile = function(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
      result = xmlhttp.responseText;
    }
    return result;
  }

  // load events template
  MapUtils.loadMapEvent = function(evtId) {
    let jsonObj = JSON.parse(MapUtils.loadFile('data/Map001.json'));
    return jsonObj.events[evtId];
  }

  // use for initialize mob
  MapUtils.loadMob = function() {
    let str = MapUtils.loadFile('data/MobData.txt');
    let all = str.split('\n');
    for (let i = 0; i < all.length; i++) {
      if (all[i].includes('//') || all[i].length < 2) {
        // comments, skip it
        continue;
      }
      let mobData = all[i].split(',');
      let mobClass = window[mobData[0]];
      let mobInitData = {};
      mobInitData.name = mobData[1];
      mobInitData.params = [1, 1, parseInt(mobData[2]), parseInt(mobData[3]), parseInt(mobData[4])
        , parseInt(mobData[5]), parseInt(mobData[6]), parseInt(mobData[7])];
      mobInitData.xparams = [parseInt(mobData[8]), parseInt(mobData[9]), mobData[10]];
      mobInitData.level = parseInt(mobData[11]);
      mobInitData.moveType = parseInt(mobData[12]);
      mobInitData.skills = [];
      // read skills
      if (mobData[13].length > 2) {
        let skillList = mobData[13].split(';');
        for (let j = 0; j < skillList.length; j++) {
          let skillData = skillList[j].split('.');
          mobInitData.skills.push(new SkillData(skillData[0], parseInt(skillData[1])));
        }
      }
      mobClass.mobInitData = mobInitData;
      // update mob status by level
      let spawnLevel = CharUtils.calcMobSpawnLevel(mobClass);
      Game_Mob.adjustMobAbility(mobClass, spawnLevel);
      // read lootings
      mobClass.lootings = [];
      if (mobData[14].length > 2) {
        let lootingList = mobData[14].split(';');
        for (let j = 0; j < lootingList.length; j++) {
          let lootingData = lootingList[j].split('.');
          // setup mob related material to mob level
          window[lootingData[0]].originalSpawnLevel = mobClass.mobInitData.originalLevel;
          window[lootingData[0]].spawnLevel = spawnLevel;
          mobClass.lootings.push(new LootingData(lootingData[0], parseInt(lootingData[1])));
        }
      }
      // read drop soul
      if (mobData[15] && mobData[15].length > 2) {
        let temp = mobData[15].split('.');
        mobClass.soulData = new SoulData(temp[0], parseInt(temp[1]));
      }
    }
    // update crafted items' spawnLevel by material (calculate by highest level material)
    for (let i = 0; i < ItemUtils.recipes.length; i++) {
      let recipe = ItemUtils.recipes[i];
      let spawnLevel = 1, originalSpawnLevel = 1;
      for (let j = 0; j < recipe.material.length; j++) {
        let materialSpawnLevel = recipe.material[j].itemClass.spawnLevel;
        let materialOriginalSpawnLevel = recipe.material[j].itemClass.originalSpawnLevel;
        spawnLevel = (materialSpawnLevel > spawnLevel) ? materialSpawnLevel : spawnLevel;
        originalSpawnLevel = (materialOriginalSpawnLevel > originalSpawnLevel)
          ? materialOriginalSpawnLevel : originalSpawnLevel;
      }
      recipe.originalSpawnLevel = originalSpawnLevel;
      recipe.spawnLevel = spawnLevel;
    }
  }

  MapUtils.dataToMap = function(dungeonName) {
    let str = MapUtils.loadFile('data/MapData.txt');
    let all = str.split('\r\n');
    let index = 0;
    for (; index < all.length; index++) {
      if (all[index].contains(dungeonName)) {
        break;
      }
    }
    let temps = [];
    for (let i = index + 1; i < all.length; i++) {
      if (all[i] == '') {
        break;
      }
      temps.push(all[i]);
    }

    let rawMap = new Array(temps[0].length);
    for (let i = 0; i < temps[0].length; i++) {
      rawMap[i] = new Array(temps.length);
    }

    for (let j = 0; j < temps.length; j++) {
      for (let i = 0; i < temps[0].length; i++) {
        rawMap[i][j] = temps[j].charAt(i);
      }
    }
    return rawMap;
  }

  MapUtils.getMapTileSet = function(mapType) {
    switch (mapType) {
      case 'EARTH':
        return DungeonTiles.earth;
      case 'ICE':
        return DungeonTiles.ice;
      case 'FIRE':
        return DungeonTiles.fire;
      case 'AIR':
        return DungeonTiles.air;
    }
    console.log('error: no such mapType: ' + mapType);
    return null;
  }

  // for spawn items/mobs usage
  MapUtils.getMapTypeIndex = function(mapType) {
    let mapTypeIndex = 0;
    switch (mapType) {
      case 'EARTH':
        mapTypeIndex = 0;
        break;
      case 'ICE':
        mapTypeIndex = 1;
        break;
      case 'FIRE':
        mapTypeIndex = 2;
        break;
    }
    return mapTypeIndex;
  }

  MapUtils.getDungeonLevelByMapId = function(mapId) {
    if (mapId < 11) {
      return mapId - 1;
    } else {
      return mapId % 10;
    }
  }

  MapUtils.checkInOutWater = function(src, oldX, oldY, nowX, nowY) {
    if (src != $gamePlayer && !(src.type && src.type == 'MOB')) {
      return;
    }
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    let realSrc = BattleUtils.getRealTarget(src);
    if ((MapDataUtils.getOriginalTile(mapData[oldX][oldY]) != MapDataUtils.getOriginalTile(mapData[nowX][nowY]))
      && (MapDataUtils.getOriginalTile(mapData[oldX][oldY]) == WATER
      || MapDataUtils.getOriginalTile(mapData[nowX][nowY]) == WATER)
      && realSrc.moveType != 2) {
      if (CharUtils.playerCanSeeBlock(nowX, nowY)) {
        AudioManager.playSe({name: 'Water1', pan: 0, pitch: 100, volume: 100});
        if (MapDataUtils.getOriginalTile(mapData[oldX][oldY]) == WATER) {
          LogUtils.addLog(String.format(Message.display('climbOutOfWater'), LogUtils.getCharName(realSrc)));
        } else {
          LogUtils.addLog(String.format(Message.display('jumpIntoWater'), LogUtils.getCharName(realSrc)));
          if (realSrc.status.wetEffect.turns == 0) {
            LogUtils.addLog(String.format(Message.display('wet'), LogUtils.getCharName(realSrc)));
          }
        }
      }
    }
  }

  // add for statistics test
  MapUtils.calcItemSpawnPercentage = function() {
    let pool = [];
    let loopCount = 0;
    let mapBlocks = MapUtils.getMapBlocks($gameVariables[$gameMap.mapId()].mapData);
    let floors = mapBlocks.floor.concat(mapBlocks.water);
    let mobNumPerMap = Math.round(floors.length * mobSpawnPercentage);
    let itemNumPerMap = Math.round(floors.length * itemSpawnPercentage);
    while (loopCount < 1000) {
      for (let i = 1; i <= 8; i++) {
        for (let j = 0; j < mobNumPerMap; j++) {
          let mobClassPool = CharUtils.getMobPools(i);
          let mobClass = CharUtils.chooseMobClassFromPool(mobClassPool);
          let mob = new mobClass(1, 1, null);
          mob.looting();
          mob.setPosition(-10, -10);
          $gameMap._events[mob._eventId] = null;
          $dataMap.events[mob._eventId] = null;
        }
        let itemPile = ItemUtils.findMapItemPileEvent(1, 1).itemPile;
        for (let id in itemPile.objectStack) {
          let className = itemPile.objectStack[id].constructor.name;
          let index = -1;
          for (let k = 0; k < pool.length; k++) {
            if (pool[k].name == className) {
              index = k;
              break;
            }
          }
          if (index == -1) {
            pool.push({name: className, count: 1});
          } else {
            pool[index].count++;
          }
        }
        // clear itemPile
        for (let id in itemPile.objectStack) {
          ItemUtils.removeItemFromItemPile(1, 1, itemPile.objectStack[id]);
        }
        for (let j = 0; j < itemNumPerMap; j++) {
          let item = ItemUtils.spawnItem(i);
          let className = item.constructor.name;
          let index = -1;
          for (let k = 0; k < pool.length; k++) {
            if (pool[k].name == className) {
              index = k;
              break;
            }
          }
          if (index == -1) {
            pool.push({name: className, count: 1});
          } else {
            pool[index].count++;
          }
        }
      }
      loopCount++;
    }
    for (let id in pool) {
      pool[id].count /= 1000;
    }
    pool.sort(function(a, b) {
      return b.count - a.count;
    })
    return pool;
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
      let targetEvt = BattleUtils.getEventFromCharacter(target);
      if (target == $gameActors.actor(1)) {
        return Message.display('player');
      } else if (!CharUtils.playerCanSeeChar(targetEvt)) {
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
    if (tile != WALL) {
      if (!$gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)]
         || $gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed) {
        return true;
      }
    }
    return false;
  }

  // only used on current map
  MapUtils.isCharacterPassable = function(charEvt, x, y) {
    let realTarget = BattleUtils.getRealTarget(charEvt);
    let mapId = $gameMap.mapId();
    let tile = MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y]);
    // check basic (wall/secret door) tile
    let passable = MapUtils.isTilePassable(mapId, x, y, tile);
    if (!passable) {
      return false;
    }
    // check if door & door opened
    if (tile == DOOR) {
      let openedDoor = $gameMap.eventsXy(x, y).filter(function(evt) {
        return evt.type == 'DOOR' && evt.status == 2;
      });
      if (!openedDoor[0]) {
        return false;
      }
    }
    // check if character occupied
    if (MapUtils.getCharXy(x, y)) {
      return false;
    }
    // check if mob can pass through tile
    if ((tile == FLOOR && realTarget.moveType == 1) || (tile == HOLLOW && realTarget.moveType != 2)
      || (tile == LAVA && realTarget.moveType != 2)) {
      return false;
    }
    return true;
  }

  MapUtils.isBolderOnTile = function(x, y) {
    return $gameMap.eventsXy(x, y).filter(function(evt) {
      return evt.type && evt.type == 'BOLDER';
    })[0] != null;
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
  MapUtils.checkVisible = function(src, distance, x, y, mapData, checkMobFlag, noCheckBolderFlag) {
    var visible = false;
    // check if on water block
    let realSrc = BattleUtils.getRealTarget(src);
    if (CharUtils.isCharInWater(src)) {
      // check if adapts water
      let skill = SkillUtils.getSkillInstance(realSrc, Skill_AdaptWater);
      if (!skill || skill.lv < 2) {
        distance = 1;
      }
    }
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
              , MapDataUtils.getOriginalTile(mapData[path[i].x][path[i].y]))
              || (!noCheckBolderFlag && MapUtils.isBolderOnTile(path[i].x, path[i].y))) {
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
          if (!MapUtils.isTilePassable($gameMap._mapId, x, i, MapDataUtils.getOriginalTile(mapData[x][i]))
          || (!noCheckBolderFlag && MapUtils.isBolderOnTile(x, i))) {
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
    let visible = (MapUtils.checkVisible(src, distance, x, y, mapData)) ? 1 : 0;
    mapData[x][y] = MapDataUtils.setVisible(mapData[x][y], visible);
  }

  function looksDifferent(mapId, rawData, x, y, tileType) {
    if (rawData && rawData[x][y] == tileType) {
      return false;
    } else if ($gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)]
      && $gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed
      && tileType == FLOOR) {
      return false;
    }
    return true;
  }

  function refineMapTile(mapId, rawData, x, y, centerTile, tileType) {
    if (tileType == WALL || tileType == PRESS || ($gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)]
      && !$gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed)) {
      return centerTile;
    }
    let east = false, west = false, south = false, north = false;
    // check east
    if (x + 1 < rawData.length && looksDifferent(mapId, rawData, x + 1, y, tileType)) {
      east = true;
    }
    // check west
    if (x - 1 >= 0 && looksDifferent(mapId, rawData, x - 1, y, tileType)) {
      west = true;
    }
    // check north
    if (y - 1 >= 0 && looksDifferent(mapId, rawData, x, y - 1, tileType)) {
      north = true;
    }
    // check south
    if (y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x, y + 1, tileType)) {
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
            // check left down
            if (x - 1 >= 0 && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x - 1, y + 1, tileType)) {
              result += 1;
            }
          }
        } else {
          if (south) {
            result += 38;
            // check left top
            if (x - 1 >= 0 && y - 1 >= 0 && looksDifferent(mapId, rawData, x - 1, y - 1, tileType)) {
              result += 1;
            }
          } else {
            result += 24;
            // check left down
            if (x - 1 >= 0 && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x - 1, y + 1, tileType)) {
              result += 1;
            }
            // check left top
            if (x - 1 >= 0 && y - 1 >= 0 && looksDifferent(mapId, rawData, x - 1, y - 1, tileType)) {
              result += 2;
            }
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
            // check right down
            if (x + 1 < rawData.length && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x + 1, y + 1, tileType)) {
              result += 1;
            }
          }
        } else {
          if (south) {
            result += 40;
            // check right top
            if (x + 1 < rawData.length && y - 1 >= 0 && looksDifferent(mapId, rawData, x + 1, y - 1, tileType)) {
              result += 1;
            }
          } else {
            result += 16;
            // check right top
            if (x + 1 < rawData.length && y - 1 >= 0 && looksDifferent(mapId, rawData, x + 1, y - 1, tileType)) {
              result += 1;
            }
            // check right down
            if (x + 1 < rawData.length && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x + 1, y + 1, tileType)) {
              result += 2;
            }
          }
        }
      } else {
        if (north) {
          if (south) {
            result += 33;
          } else {
            result += 20;
            // check right down
            if (x + 1 < rawData.length && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x + 1, y + 1, tileType)) {
              result += 1;
            }
            if (x - 1 >= 0 && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x - 1, y + 1, tileType)) {
              result += 2;
            }
            // check left down
          }
        } else {
          if (south) {
            result += 28;
            // check left top
            if (x - 1 >= 0 && y - 1 >= 0 && looksDifferent(mapId, rawData, x - 1, y - 1, tileType)) {
              result += 1;
            }
            // check right top
            if (x + 1 < rawData.length && y - 1 >= 0 && looksDifferent(mapId, rawData, x + 1, y - 1, tileType)) {
              result += 2;
            }
          } else {
            // check corners
            // left top
            if (x - 1 >= 0 && y - 1 >= 0 && looksDifferent(mapId, rawData, x - 1, y - 1, tileType)) {
              result += 1;
            }
            // right top
            if (x + 1 < rawData.length && y - 1 >= 0 && looksDifferent(mapId, rawData, x + 1, y - 1, tileType)) {
              result += 2;
            }
            // right down
            if (x + 1 < rawData.length && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x + 1, y + 1, tileType)) {
              result += 4;
            }
            // left down
            if (x - 1 >= 0 && y + 1 < rawData[0].length && looksDifferent(mapId, rawData, x - 1, y + 1, tileType)) {
              result += 8;
            }
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
      // tutorial: getDrop
      TimeUtils.tutorialHandler.queue.push("getDrop");
    }
    // always show msg box, to avoid window lag (don't know why)
    MapUtils.displayMessageNonBlocking(msg);
  }

  MapUtils.translateMap = function (rawData, mapId) {
    $gameVariables[0].currentDungeonTiles = MapUtils.getMapTileSet($gameVariables[mapId].mapType);
    var mapData = new Array(rawData.length);
    for (var i = 0; i < mapData.length; i++) {
      mapData[i] = new Array(rawData[0].length);
      for (var j = 0; j < rawData[0].length; j++) {
        let center = $gameVariables[0].currentDungeonTiles.floorCenter;
        // deal with tile IDs
        switch (rawData[i][j]) {
          case WALL:
            center = $gameVariables[0].currentDungeonTiles.ceilingCenter;
            break;
          case DOOR:
            if ($gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(i, j)]) {
              center = $gameVariables[0].currentDungeonTiles.ceilingCenter;
            } else {
              new Game_Door(i, j);
            }
            break;
          case WATER:
            center = $gameVariables[0].currentDungeonTiles.waterCenter;
            break;
          case LAVA:
            center = $gameVariables[0].currentDungeonTiles.lavaCenter;
            break;
          case PRESS:
            center = pressFloor;
            break;
        }
        let tile = refineMapTile(mapId, rawData, i, j, center, rawData[i][j]);
        mapData[i][j] = MapDataUtils.create(tile, rawData[i][j], i, j);
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
    mapArray.length = mapSize * 6;
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
    var hollowOffset = mapSize;
    var stairOffset = mapSize * 2;
    var itemOffset = mapSize * 3;
    var warFogOffset = mapSize * 4;
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        if (MapDataUtils.getVisible(mapData[i][j]) || MapDataUtils.getExplored(mapData[i][j])) {
          mapArray[index] = MapDataUtils.getBase(mapData[i][j]);
          mapData[i][j] = MapDataUtils.setExplored(mapData[i][j], 1);
          if (MapDataUtils.getVisible(mapData[i][j])) {
            // update item piles
            mapArray[itemOffset + index] = 0;
            // update hollow
            // mapArray[hollowOffset + index] = mapData[i][j].bush;
          }
        }
        if (!MapDataUtils.getVisible(mapData[i][j]) && MapDataUtils.getExplored(mapData[i][j])) {
          mapArray[warFogOffset + index] = warFogCenter;
        }
        index++;
      }
    }

    // draw doors
    for (var i in $gameMap.events()) {
      var event = $gameMap.events()[i];
      if (event instanceof Game_Door && MapDataUtils.getExplored(mapData[event._x][event._y])) {
        var index = stairOffset + event._y * mapData.length + event._x;
        if (MapDataUtils.getVisible(mapData[event._x][event._y])) {
          mapArray[index] = (event.status == 2) ? doorOpenedIcon : doorClosedIcon;
          event.lastStatus = event.status;
        } else {
          // show last status
          mapArray[index] = (event.lastStatus == 2) ? doorOpenedIcon : doorClosedIcon;
        }
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
    if (MapDataUtils.getVisible(mapData[event._x][event._y])) {
      if (event.mob.status.invisibleEffect.turns > 0 || CharUtils.isCharInWater(event)) {
        if (CharUtils.playerCanSeeChar(event)) {
          event.setOpacity(128);
          // tutorial: meleeAttack
          TimeUtils.tutorialHandler.queue.push("meleeAttack");
        } else {
          event.setOpacity(0);
        }
      } else {
        event.setOpacity(255);
        // tutorial: meleeAttack
        TimeUtils.tutorialHandler.queue.push("meleeAttack");
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
      } else if (event._x > 0 && event._y > 0 && MapDataUtils.getVisible(mapData[event._x][event._y])) {
        if (event.type == 'MOB') { // mob
          MapUtils.drawMob(mapData, event);
        } else if (event.type == 'AURA') {
          event.setOpacity(128);
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
    // add for reduce save file size
    if (mapVariable.rmDataMap) {
      mapVariable.rmDataMap.data.length = 0;
    }
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

    stair.toMapId = mapVariable.stairToList[mapVariable.stairList.indexOf(stair)];
    if (character == $gamePlayer) {
      $gameVariables[0].transferInfo = new TransferInfo(stair.toMapId, character._x, character._y);
      $gameScreen.startFadeOut(1);
      // clear scheduler
      TimeUtils.eventScheduler.clearEventExceptPlayer();
      // clear aura events
      let auraEvents = $gameMap.events().filter(function(evt) {
        return evt.type == 'AURA';
      })
      for (let id in auraEvents) {
        let target = auraEvents[id];
        target.setPosition(-10, -10);
        $gameMap._events[target._eventId] = null;
        $dataMap.events[target._eventId] = null;
      }
      // wait until map is fully loaded
      var checkMapReady = function () {
        if (SceneManager.isCurrentSceneStarted()) {
          // setup current dungeon tiles
          $gameVariables[0].currentDungeonTiles = MapUtils.getMapTileSet($gameVariables[$gameMap.mapId()].mapType);
          // restore mob status/effect
          TimeUtils.eventScheduler.restoreMobStatusEffect();
          // check carry status
          if (stair.type == 1 && $gameActors.actor(1).carryStatus > 1) {
            let damage = dice(2, 3);
            AudioManager.playSe({name: 'Damage3', pan: 0, pitch: 100, volume: 100});
            TimeUtils.animeQueue.push(new AnimeObject($gamePlayer, 'POP_UP', damage * -1));
            LogUtils.addLog(String.format(Message.display('damageFallFromStair'), damage));
            CharUtils.decreaseHp($gameActors.actor(1), damage);
            BattleUtils.checkTargetAlive(null, $gameActors.actor(1), $gamePlayer);
          }
          // system auto run: create & update mobs time at target layer

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

  MapUtils.goDownLevels = function(depth) {
    let func = function(depth) {
      if ($gamePlayer.isTransferring()) {
        setTimeout(func, 500, depth);
      } else if (depth > 0) {
        // do down a level
        depth--;
        let stairs = $gameVariables[$gameMap.mapId()].stairList;
        let stairDown;
        for (let id in stairs) {
          if (stairs[id].type == 1 && stairs[id].toMapId <= 10) {
            stairDown = stairs[id];
          }
        }
        $gamePlayer.locate(stairDown.x, stairDown.y);
        MapUtils.transferCharacter($gamePlayer);
        setTimeout(func, 500, depth);
      }
    }
    func(depth);
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
    if (MapUtils.isTilePassable(mapId, x, y, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y]))) {
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
        if (events[id].type == 'MOB' && events[id].mob.moveType != 1 && !events[id].mob.layerFixed) { // mobs in water can not change floor
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
            // need to transfer mob status too
            let effects = TimeUtils.eventScheduler.extractTargetEffects(mobData.x, mobData.y, nowMapId);
            for (let id in effects) {
              // setup target's new position
              effects[id].target._x = toCheck.x;
              effects[id].target._y = toCheck.y;
              $gameVariables[toMapId].mobStatusEffectList.push(effects[id]);
            }
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
      let func = function() {
        if (SceneManager._scene.createDisplayObjects) {
          var scene = SceneManager._scene;
          scene.removeChild(scene._fadeSprite);
          scene.removeChild(scene._mapNameWindow);
          scene.removeChild(scene._windowLayer);
          scene.removeChild(scene._spriteset);
          scene.createDisplayObjects();
          scene.setupStatus();
        } else {
          setTimeout(func, 5);
        }
      }
      func();
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

  MapUtils.updateAdjacentTiles = function(centerX, centerY) {
    let currentMapData = $gameVariables[$gameMap.mapId()].mapData;
    // create raw data
    let rawData = new Array(currentMapData.length);
    for (let i = 0; i < currentMapData.length; i++) {
      rawData[i] = new Array(currentMapData[0].length);
      for (let j = 0; j < currentMapData[0].length; j++) {
        rawData[i][j] = MapDataUtils.getOriginalTile(currentMapData[i][j]);
      }
    }
    for (let x = centerX - 1; x < centerX + 2; x++) {
      for (let y = centerY - 1; y < centerY + 2; y++) {
        if ((x >= 0 && x < currentMapData.length) && (y >= 0 && y < currentMapData[0].length)
          && MapDataUtils.getOriginalTile(currentMapData[x][y]) != WALL) {
          let tileCenter, tileType;
          switch (MapDataUtils.getOriginalTile(currentMapData[x][y])) {
            case FLOOR:
              tileCenter = $gameVariables[0].currentDungeonTiles.floorCenter;
              tileType = FLOOR;
              break;
            case DOOR:
              let mapId = $gameMap.mapId();
              if ($gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)]
                && !$gameVariables[mapId].secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed) {
                tileCenter = $gameVariables[0].currentDungeonTiles.ceilingCenter;
                tileType = WALL;
              } else {
                tileCenter = $gameVariables[0].currentDungeonTiles.floorCenter;
                tileType = FLOOR;
              }
              break;
            case WATER:
              tileCenter = $gameVariables[0].currentDungeonTiles.waterCenter;
              tileType = WATER;
              break;
            case LAVA:
              tileCenter = $gameVariables[0].currentDungeonTiles.lavaCenter;
              tileType = LAVA;
              break;
            case HOLLOW:
              tileCenter = $gameVariables[0].currentDungeonTiles.hollowCenter;
              tileType = HOLLOW;
              break;
          }
          currentMapData[x][y] = MapDataUtils.setBase(currentMapData[x][y], refineMapTile($gameMap.mapId(), rawData
          , x, y, tileCenter, tileType));
        }
      }
    }
  }

  MapUtils.playEventFromTemplate = function(evtTemplateId) {
    let eventId = $dataMap.events.length;
    $dataMap.events.push(newDataMapEvent(evtTemplateId, eventId, 0, 0));
    let evt = new Game_Event($gameMap.mapId(), eventId);
    $gameMap._events[eventId] = evt;
    evt.start();
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
    let deltaX = Math.abs(x1 - x2);
    let deltaY = Math.abs(y1 - y2);
    return (deltaX > deltaY) ? deltaX : deltaY;
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

  MapUtils.generateMapData = function (mapId, genMapFunction, width, height) {
    var mapRaw = genMapFunction(width, height);
    var mapPixel = genMapToMap(mapRaw);

    // change map feature by mapId
    let mapType = $gameVariables[mapId].mapType;
    let xBound = mapPixel.length;
    let yBound = mapPixel[0].length;
    let poolNum;
    if (mapType == 'EARTH') {
      poolNum = getRandomInt(2);
    } else {
      poolNum = getRandomIntRange(6, 10);
    }
    let poolTile = WATER;
    if (mapType == 'FIRE') {
      poolTile = LAVA;
    }
    for (let i = 0; i < poolNum; i++) {
      if (poolTile == WATER) {
        let x = getRandomIntRange(2, xBound - 3);
        let y = getRandomIntRange(2, yBound - 3);
        for (let j = x - 1; j < x + 2; j++) {
          for (let k = y - 1; k < y + 2; k++) {
            mapPixel[j][k] = poolTile;
          }
        }
      } else {
        let x = getRandomIntRange(3, xBound - 4);
        let y = getRandomIntRange(3, yBound - 4);
        for (let j = x - 2; j < x + 3; j++) {
          for (let k = y - 2; k < y + 3; k++) {
            if ((j == x - 2 || j == x + 2 || k == y - 2 || k == y + 2) && mapPixel[j][k] != poolTile) {
              // add border land
              mapPixel[j][k] = FLOOR;
            } else {
              mapPixel[j][k] = poolTile;
            }
          }
        }
      }
    }
    // add for press floor test
    if (mapId == dungeonDepth) {
      let mapTemplate = [
        [FLOOR, FLOOR, FLOOR, FLOOR, FLOOR],
        [FLOOR, WALL, FLOOR, WALL, FLOOR],
        [FLOOR, FLOOR, FLOOR, FLOOR, FLOOR],
        [FLOOR, WALL, FLOOR, PRESS, FLOOR],
        [FLOOR, FLOOR, FLOOR, FLOOR, FLOOR]
      ]
      let xStart = getRandomIntRange(2, xBound - 5);
      let yStart = getRandomIntRange(2, yBound - 5);
      for (let i = xStart - 1; i < xStart + 4; i++) {
        for (let j = yStart - 1; j < yStart + 4; j++) {
          let x = i - xStart + 1, y = j - yStart + 1;
          mapPixel[i][j] = mapTemplate[x][y];
          if (x == 2 && y == 2) {
            // press
            $gameVariables[mapId].preDefinedTraps.push(new TrapData('Trap_GoHome', i, j));
          } else if (x == 3 && y == 3) {
            // go_home
            $gameVariables[mapId].preDefinedTraps.push(new TrapData('Trap_PressFloor', i, j, 'Trap_GoHome'));
          }
        }
      }
    }
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
  MapUtils.findShortestRoute = function (mobEvt, x2, y2, maxPathLength) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var path = [], explored = [];

    explored.push(new RouteData(mapData[mobEvt._x][mobEvt._y], 0));
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
        let nodeX = MapDataUtils.getX(node.mapBlock), nodeY = MapDataUtils.getY(node.mapBlock);
        for (let i = 0; i < 8; i++) {
          let coordinate = MapUtils.getNearbyCoordinate(nodeX, nodeY, i);
          // check if node already exists
          let exists = explored.filter(function(routeData) {
            return MapDataUtils.getX(routeData.mapBlock) == coordinate.x
              && MapDataUtils.getY(routeData.mapBlock) == coordinate.y;
          })
          if (exists[0]) { // block already explored, check & update weight
            exists[0].weight = (steps < exists[0].weight) ? steps : exists[0].weight;
          } else { // block not exists, add to exploredList
            let mapBlock = mapData[coordinate.x][coordinate.y];
            let weight = -1;
            if (MapUtils.isCharacterPassable(mobEvt, coordinate.x, coordinate.y)) {
              weight = steps;
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
            if (MapUtils.isNearBy(MapDataUtils.getX(node.mapBlock), MapDataUtils.getY(node.mapBlock),
              MapDataUtils.getX(nodeAfter.mapBlock), MapDataUtils.getY(nodeAfter.mapBlock)) &&
              MapUtils.isNearBy(MapDataUtils.getX(node.mapBlock), MapDataUtils.getY(node.mapBlock),
              MapDataUtils.getX(nodeBefore.mapBlock), MapDataUtils.getY(nodeBefore.mapBlock))) {
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
    $gameVariables[0].exploredLayerCount++;
    var rawMap;
    if (mapId == dungeonOffset.ice + subDungeonDepth) {
      // ice boss room
      rawMap = MapUtils.dataToMap('iceBossRoom');
    } else if (mapId == dungeonOffset.fire + subDungeonDepth) {
      // fire boss room
      rawMap = MapUtils.dataToMap('fireBossRoom');
    } else if (mapId == dungeonDepth) {
      // for test only
      rawMap = MapUtils.dataToMap('earthBossRoom');
    } else {
      rawMap = MapUtils.generateMapData(mapId, genMapRoomsFullMaze, 20, 10);
      rawMap = MapUtils.removeDeadEnds(rawMap);
      MapUtils.setupSecretDoor(mapId, rawMap);
    }
    var newMapData = MapUtils.translateMap(rawMap, mapId);
    $dataMap.width = rawMap.length;
    $dataMap.height = rawMap[0].length;
    $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
    $gameVariables[mapId].mapData = newMapData;
    $gameVariables[mapId].rmDataMap = $dataMap;
  }

  MapUtils.generateNewMapMobs = function (mapId, mapBlocks) {
    let totalBlocksLength = mapBlocks.floor.length + mapBlocks.water.length + mapBlocks.hollow.length;
    for (let id in $gameVariables[mapId].preDefinedMobs) {
      let mobData = $gameVariables[mapId].preDefinedMobs[id];
      let mobClass = window[mobData.mobClassName];
      if (mobData.coordinate) {
        // place defined
        new mobClass(mobData.coordinate.x, mobData.coordinate.y, null);
      } else {
        CharUtils.spawnMob(mapId, mapBlocks, false, mobClass);
      }
    }
    if ($gameVariables[mapId].spawnMobs) {
      let mobCounts = Math.floor(totalBlocksLength * mobSpawnPercentage);
      for (let i = 0; i < mobCounts; i++) {
        CharUtils.spawnMob(mapId, mapBlocks);
      }
    }
  }

  MapUtils.addMobToNowMap = function() {
    let mapId = $gameMap.mapId();
    let mapBlocks = MapUtils.getMapBlocks($gameVariables[mapId].mapData);
    let mapEvts = $gameMap.events();
    let nowMobCount = 0;
    for (let id in mapEvts) {
      if (mapEvts[id].type == 'MOB') {
        nowMobCount++;
      }
    }
    let mobNum = (mapBlocks.floor.length + mapBlocks.water.length + mapBlocks.hollow.length)
      * mobSpawnPercentage * mobRespawnPercentage;
    if (nowMobCount < mobNum) {
      CharUtils.spawnMob(mapId, mapBlocks, true);
    }
  }

  MapUtils.generateNewMapItems = function(mapId, floors) {
    if ($gameVariables[mapId].spawnItems) {
      let itemCount = Math.floor(floors.length * itemSpawnPercentage);
      for (let i = 0; i < itemCount; i++) {
        while (true) {
          let floor = floors[getRandomInt(floors.length)];
          // do not place item on trap that can cause position movement
          let evts = $gameMap.eventsXy(MapDataUtils.getX(floor), MapDataUtils.getY(floor));
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
            ItemUtils.addItemToItemPile(MapDataUtils.getX(floor), MapDataUtils.getY(floor), ItemUtils.spawnItem(mapId));
            break;
          }
        }
      }
    }
  }

  MapUtils.getMapBlocks = function (mapData) {
    var floor = [], water = [], hollow = [];
    for (var j = 0; j < mapData[0].length; j++) {
      for (var i = 0; i < mapData.length; i++) {
        switch (MapDataUtils.getOriginalTile(mapData[i][j])) {
          case FLOOR:
            floor.push(mapData[i][j]);
            break;
          case WATER:
            water.push(mapData[i][j]);
            break;
          case HOLLOW:
            hollow.push(mapData[i][j]);
            break;
        }
      }
    }
    return new MapBlocks(floor, water, hollow);
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

  MapUtils.getCharXy = function(x, y) {
    let evts = $gameMap.eventsXy(x, y);
    let target = null;
    for (let id in evts) {
      if (evts[id].type == 'MOB') {
        target = evts[id];
      }
    }
    if ($gamePlayer.pos(x, y)) {
      target = $gamePlayer;
    }
    return target;
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
          // play background music
          let bgm = {name: $gameVariables[targetMapId].bgm, pan: 0, pitch: 100, volume: 100};
          AudioManager.playBgm(bgm);
          if (!$gameVariables[targetMapId].mapData) {
            var nowMapId = $gameMap.mapId();
            // first time assign data
            MapUtils.setupNewMap(targetMapId);

            // collect all FLOOR tiles
            let mapVariable = $gameVariables[nowMapId];
            let targetMapVariable = $gameVariables[targetMapId];
            let targetMapData = $gameVariables[targetMapId].mapData;
            let floors = MapUtils.getMapBlocks(targetMapData).floor;
            // create up stairs
            let stairUpCreated = 0;
            let stairIndex = 0;
            while (stairUpCreated < targetMapVariable.stairUpNum) {
              let preDefinedStairs = $gameVariables[targetMapId].preDefinedStairs;
              let stairUpData;
              let candidate;
              for (let i = 0; i < preDefinedStairs.length; i++) {
                if (preDefinedStairs[i].type == 0) {
                  stairUpData = preDefinedStairs[i];
                  preDefinedStairs.splice(i, 1);
                  break;
                }
              }
              if (stairUpData) {
                candidate = new Coordinate(stairUpData.x, stairUpData.y);
              } else {
                let randId = getRandomInt(floors.length);
                let floor = floors[randId];
                candidate = new Coordinate(MapDataUtils.getX(floor), MapDataUtils.getY(floor));
                floors.splice(randId, 1); // remove it from candidate list
              }
              let newStair = new StairData();
              newStair.x = candidate.x;
              newStair.y = candidate.y;
              newStair.toMapId = targetMapVariable.stairToList[stairIndex];
              targetMapVariable.stairList.push(newStair);
              if (targetMapVariable.stairToList[stairIndex] == nowMapId) {
                let toConnect;
                for (let i = 0; i < mapVariable.stairList.length; i++) {
                  if (mapVariable.stairList[i].toMapId == targetMapId) {
                    toConnect = mapVariable.stairList[i];
                  }
                }
                toConnect.toX = newStair.x;
                toConnect.toY = newStair.y;
                newStair.toX = toConnect.x;
                newStair.toY = toConnect.y;
              }
              stairUpCreated++;
              stairIndex++;
            }
            // create down stairs
            let stairDownCreated = 0;
            while (stairDownCreated < $gameVariables[targetMapId].stairDownNum) {
              let preDefinedStairs = $gameVariables[targetMapId].preDefinedStairs;
              let stairDownData;
              let candidate;
              for (let i = 0; i < preDefinedStairs.length; i++) {
                if (preDefinedStairs[i].type == 1) {
                  stairDownData = preDefinedStairs[i];
                  preDefinedStairs.splice(i, 1);
                  break;
                }
              }
              if (stairDownData) {
                candidate = new Coordinate(stairDownData.x, stairDownData.y);
              } else {
                let randId = getRandomInt(floors.length);
                let floor = floors[randId];
                candidate = new Coordinate(MapDataUtils.getX(floor), MapDataUtils.getY(floor));
                floors.splice(randId, 1); // remove it from candidate list
              }
              let newStair = new StairData();
              newStair.type = 1;
              newStair.x = candidate.x;
              newStair.y = candidate.y;
              newStair.toMapId = targetMapVariable.stairToList[stairIndex];
              $gameVariables[targetMapId].stairList.push(newStair);
              if (targetMapVariable.stairToList[stairIndex] == nowMapId) {
                let toConnect;
                for (let i = 0; i < mapVariable.stairList.length; i++) {
                  if (mapVariable.stairList[i].toMapId == targetMapId) {
                    toConnect = mapVariable.stairList[i];
                  }
                }
                toConnect.toX = newStair.x;
                toConnect.toY = newStair.y;
                newStair.toX = toConnect.x;
                newStair.toY = toConnect.y;
              }
              stairDownCreated++;
              stairIndex++;
            }

            let nowStair = null;
            for (let i = 0; i < mapVariable.stairList.length; i++) {
              let candidate = mapVariable.stairList[i];
              if (candidate.x == $gameVariables[0].transferInfo.nowX && candidate.y == $gameVariables[0].transferInfo.nowY) {
                nowStair = candidate;
                break;
              }
            }
            if (targetMapId == 2) {
              // do not generate upstair on dungeon level 1
              let stairList = targetMapVariable.stairList;
              for (let id in stairList) {
                if (stairList[id].type == 0) {
                  stairList.splice(id, 1);
                  targetMapVariable.stairToList.splice(0, 1);
                  break;
                }
              }
            }
            $gamePlayer.reserveTransfer(targetMapId, nowStair.toX, nowStair.toY, 0, 2);
            MapUtils.transferNearbyMobs(nowMapId, targetMapId, nowStair.x, nowStair.y, nowStair.toX, nowStair.toY);

            // new mobs in map
            var setupEvents = function (nowMapId, targetMapId, nowStair) {
              if (SceneManager.isCurrentSceneStarted()) {
                let mapBlocks = MapUtils.getMapBlocks($gameVariables[targetMapId].mapData);
                TrapUtils.generateTraps(targetMapId, mapBlocks.floor);
                MapUtils.generateNewMapMobs(targetMapId, mapBlocks);
                MapUtils.generateNewMapItems(targetMapId, mapBlocks.floor.concat(mapBlocks.water));
                MapUtils.drawEvents($gameVariables[targetMapId].mapData);
                SceneManager.goto(Scene_Map);
                if (targetMapId == dungeonOffset.ice + 1) {
                  MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.visitIceDungeon);
                } else if (targetMapId == dungeonOffset.fire + 1) {
                  MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.visitFireDungeon);
                }
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

  // override this so web players won't run into cache limit problem
  DataManager.maxSavefiles = function() {
    return 5;
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
    } else if (actor.status.blindEffect.turns > 0) {
      let coordinate = Input.getNextCoordinate($gamePlayer, d.toString());
      if (!MapDataUtils.getExplored($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y])) {
        $gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]
          = MapDataUtils.setExplored($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y], 1);
        let format;
        if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]) == DOOR) {
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
    return moved;
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
    } else if (actor.status.blindEffect.turns > 0) {
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
      if (!MapDataUtils.getExplored($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y])) {
        $gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]
          = MapDataUtils.setExplored($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y], 1);
        if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]) == DOOR) {
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
    return moved;
  };

  //-----------------------------------------------------------------------------------
  // Game_CharacterBase
  //

  // modify this for different mob moveType
  Game_CharacterBase.prototype.canPass = function(x, y, d) {
    var x2 = $gameMap.roundXWithDirection(x, d);
    var y2 = $gameMap.roundYWithDirection(y, d);
    if (this.isThrough() || this.isDebugThrough()) {
        return true;
    }
    if (!this.isMapPassable(x, y, d)) {
        return false;
    }
    if (this.isCollidedWithCharacters(x2, y2)) {
        return false;
    }
  
    if (this.mob) {
      // check mob moveType
      switch (this.mob.moveType) {
        case 0:
          if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x2][y2]) == HOLLOW) {
            return false;
          }
          break;
        case 1:
          if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x2][y2]) != WATER) {
            return false;
          }
          break;
      }
    }
    return true;
  };

  Game_CharacterBase.prototype.moveStraight = function(d) {
    let oldX = this._x, oldY = this._y;
    this.setMovementSuccess(this.canPass(this._x, this._y, d));
    if (this.isMovementSucceeded()) {
      this.setDirection(d);
      this._x = $gameMap.roundXWithDirection(this._x, d);
      this._y = $gameMap.roundYWithDirection(this._y, d);
      this._realX = $gameMap.xWithDirection(this._x, this.reverseDir(d));
      this._realY = $gameMap.yWithDirection(this._y, this.reverseDir(d));

      // check & move aura
      let vm = this;
      let auraEvts = $gameMap.events().filter(function(evt) {
        return evt.type == 'AURA' && evt.caster == vm;
      })
      if (auraEvts[0]) {
        auraEvts[0].moveStraight(d);
      }

      this.increaseSteps();
      MapUtils.checkInOutWater(this, oldX, oldY, this._x, this._y);
      return true;
    } else {
      this.setDirection(d);
      this.checkEventTriggerTouchFront(d);
      return false;
    }
  }

  // Modify moveDiagonally(), so it can trigger diagonal events
  Game_CharacterBase.prototype.moveDiagonally = function (horz, vert) {
    let oldX = this._x, oldY = this._y;
    this.setMovementSuccess(this.canPassDiagonally(this._x, this._y, horz, vert));
    var moved = false;
    if (this.isMovementSucceeded()) {
      this._x = $gameMap.roundXWithDirection(this._x, horz);
      this._y = $gameMap.roundYWithDirection(this._y, vert);
      this._realX = $gameMap.xWithDirection(this._x, this.reverseDir(horz));
      this._realY = $gameMap.yWithDirection(this._y, this.reverseDir(vert));

      // check & move aura
      let vm = this;
      let auraEvts = $gameMap.events().filter(function(evt) {
        return evt.type == 'AURA' && evt.caster == vm;
      })
      if (auraEvts[0]) {
        auraEvts[0].moveDiagonally(horz, vert);
      }

      this.increaseSteps();
      moved = true;
      MapUtils.checkInOutWater(this, oldX, oldY, this._x, this._y);
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
    return moved;
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
      if (MapUtils.isTilePassable($gameMap.mapId(), x2, y2, MapDataUtils.getOriginalTile(mapData[x2][y2]))) {
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
        if (canPass && this.mob) {
          // check mob moveType
          switch (this.mob.moveType) {
            case 0:
              if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x2][y2]) == HOLLOW) {
                return false;
              }
              break;
            case 1:
              if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x2][y2]) != WATER) {
                return false;
              }
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

  // modify this so aura can follow character
  Game_CharacterBase.prototype.setPosition = function(x, y) {
    this._x = Math.round(x);
    this._y = Math.round(y);
    this._realX = x;
    this._realY = y;
    // check & move aura
    if ($gameMap) {
      let vm = this;
      let auraEvts = $gameMap.events().filter(function(evt) {
        return evt.type == 'AURA' && evt.caster == vm;
      })
      if (auraEvts[0]) {
        auraEvts[0].setPosition(x, y);
      }
    }
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
        , MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x][y]))) {
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
        } else if ($dataMap.events[i].type == 'TERRAIN') {
          this._events[i] = new window[$dataMap.events[i].evt.className]($dataMap.events[i].x
            , $dataMap.events[i].y, $dataMap.events[i]);
        } else if ($dataMap.events[i].type == 'BOLDER') {
          this._events[i] = new window[$dataMap.events[i].className]($dataMap.events[i].x
            , $dataMap.events[i].y, $dataMap.events[i]);
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

  // modify those functions because somehow it can crash when $dataMap is null (don't know when)
  Game_Map.prototype.isLoopHorizontal = function() {
    return false;
  };

  Game_Map.prototype.isLoopVertical = function() {
    return false;
  };

  // modify this to prevent null exception when loading $dataMap
  Game_Map.prototype.width = function() {
    return ($dataMap) ? $dataMap.width : $gameVariables[$gameMap.mapId()].rmDataMap.width;
  };

  Game_Map.prototype.height = function() {
    return ($dataMap) ? $dataMap.height : $gameVariables[$gameMap.mapId()].rmDataMap.height;
  };

  function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function newDataMapEvent(evtId, id, x, y) {
    var newObj = cloneObject(MapUtils.loadMapEvent(evtId));
    newObj.id = id;
    newObj.x = x;
    newObj.y = y;
    return newObj;
  }

  //-----------------------------------------------------------------------------
  // Bolder
  //
  // The game object class for bolder type objects

  Bolder = function () {
    this.initialize.apply(this, arguments);
  }

  Bolder.prototype = Object.create(Game_Event.prototype);
  Bolder.prototype.constructor = Bolder;

  Bolder.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.className = src.className;
    target.mob = src.mob; // for teleport purpose
  }

  Bolder.prototype.initStatus = function (event) {
    event.type = 'BOLDER';
    event.mob = {
      name: function() {
        return this._name;
      }
    };
    event.mob.status = CharUtils.initStatus();
  }

  Bolder.prototype.updateDataMap = function () {
    Bolder.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Bolder.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Bolder.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // find empty space for new event
      var eventId = MapUtils.findEmptyFromList($dataMap.events);
      $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.bolder, eventId, x, y);
      this.initStatus($dataMap.events[eventId]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    // setup image
    this.setImage('!Other1', 1);
    this.name = '巨岩';
    $gameMap._events[eventId] = this;
  };

  // override this function, so bolder can pass through door/itemPiles
  Bolder.prototype.isCollidedWithEvents = function (x, y) {
    return Game_CharacterBase.prototype.isCollidedWithEvents.call(this, x, y);
  };

  Bolder.prototype.onPush = function(src) {
    if (MapUtils.getCharXy(this._x, this._y)) {
      // char on this block, do nothing
      return;
    }
    let data = MapUtils.getDisplacementData(src._x, src._y, this.x, this.y);
    let moved = false;
    if (data.moveFunc == 'moveStraight') {
      moved = this.moveStraight(data.param1);
      src.moveStraight(data.param1);
    } else if (data.moveFunc == 'moveDiagonally') {
      moved = this.moveDiagonally(data.param1, data.param2);
      src.moveDiagonally(data.param1, data.param2);
    }
    if (moved) {
      AudioManager.playSe({name: 'Push', pan: 0, pitch: 100, volume: 100});
      let realSrc = BattleUtils.getRealTarget(src);
      LogUtils.addLog(String.format(Message.display('pushObject'), LogUtils.getCharName(realSrc)
        , this.name));
      this.checkTerrainEffect();
      if (this._x > 0 && this._y > 0) {
        this.updateDataMap();
      }
    }
  }

  Bolder.prototype.checkTerrainEffect = function() {
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    if (this._x < 0 || this._y < 0) {
      // event already removed
      return;
    }
    // check if hit specific tile
    switch (MapDataUtils.getOriginalTile(mapData[this._x][this._y])) {
      case WATER:
        this.hitWater();
        break;
      case LAVA:
        this.hitLava();
        break;
      case HOLLOW:
        this.hitHollow();
        break;
    }
    // check if hit specific trap
    let trap = TrapUtils.getMapTrap(this._x, this._y);
    if (trap) {
      switch (trap.trap.trapClass) {
        case 'Trap_GroundHole':
          this.hitGroundHoleTrap(trap);
          break;
        case 'Trap_Teleport':
          this.hitTeleportTrap(trap);
          break;
      }
    }
  }

  Bolder.prototype.hitWater = function() {
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    // change tile to floor
    mapData[this._x][this._y] = MapDataUtils.setOriginalTile(mapData[this._x][this._y], FLOOR);
    MapUtils.updateAdjacentTiles(this._x, this._y);
    // remove bolder
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
    MapUtils.refreshMap();
    AudioManager.playSe({name: 'Earth3', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(String.format(Message.display('bolderFilledHole'), this.name));
  }

  Bolder.prototype.hitLava = function() {
    this.hitWater();
  }

  Bolder.prototype.hitHollow = function() {
    // remove bolder
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
    MapUtils.refreshMap();
    AudioManager.playSe({name: 'Fall', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(String.format(Message.display('bolderHitHollow'), this.name));
  }

  Bolder.prototype.hitGroundHoleTrap = function(trap) {
    // remove ground hole trap
    trap.setPosition(-10, -10);
    $gameMap._events[trap._eventId] = null;
    $dataMap.events[trap._eventId] = null;
    // fill the floor
    this.hitWater();
  }

  Bolder.prototype.hitTeleportTrap = function(trap) {
    trap.triggered(this);
    this.checkTerrainEffect();
  }

  //-----------------------------------------------------------------------------
  // IceBolder
  //
  // inherit from Bolder

  IceBolder = function () {
    this.initialize.apply(this, arguments);
  }

  IceBolder.prototype = Object.create(Bolder.prototype);
  IceBolder.prototype.constructor = IceBolder;

  IceBolder.melt = function(target) {
    MapUtils.refreshMap();
    if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
      AudioManager.playSe({name: 'Water5', pan: 0, pitch: 100, volume: 100});
      LogUtils.addLog(String.format(Message.display('iceMelt'), target.name));
    }
    target.setPosition(-10, -10);
    $gameMap._events[target._eventId] = null;
    $dataMap.events[target._eventId] = null;
    MapUtils.refreshMap();
  }

  IceBolder.prototype.initialize = function (x, y, fromData) {
    Bolder.prototype.initialize.call(this, x, y, fromData);
    this.setImage('!Other1', 2);
    this.name = '冰岩';
    this.mob._name = this.name;
    this.className = this.constructor.name;
    this.updateDataMap();
  }

  IceBolder.prototype.hitWater = function() {
    // ice bolder melt and disappear
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
    // remove from eventQueue
    TimeUtils.eventScheduler.removeEvent(this);
    MapUtils.refreshMap();
    AudioManager.playSe({name: 'Water5', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(String.format(Message.display('iceMeltInWater'), this.name));
  }

  IceBolder.prototype.hitLava = function() {
    // cool lava down to foor
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    // change tile to floor
    mapData[this._x][this._y] = MapDataUtils.setOriginalTile(mapData[this._x][this._y], FLOOR);
    MapUtils.updateAdjacentTiles(this._x, this._y);
    // remove bolder
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
    // remove from eventQueue
    TimeUtils.eventScheduler.removeEvent(this);
    MapUtils.refreshMap();
    AudioManager.playSe({name: 'Water2', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(String.format(Message.display('iceHitLava'), this.name));
  }

  IceBolder.prototype.hitGroundHoleTrap = function(trap) {
    // melt and fill pit to water hole
    // change tile to floor
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    mapData[this._x][this._y] = MapDataUtils.setOriginalTile(mapData[this._x][this._y], WATER);
    MapUtils.updateAdjacentTiles(this._x, this._y);
    // remove ground hole trap
    trap.setPosition(-10, -10);
    $gameMap._events[trap._eventId] = null;
    $dataMap.events[trap._eventId] = null;
    // remove bolder
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
    // remove from eventQueue
    TimeUtils.eventScheduler.removeEvent(this);
    MapUtils.refreshMap();
    AudioManager.playSe({name: 'Water5', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(String.format(Message.display('iceMeltInHole'), this.name));
  }

  //-----------------------------------------------------------------------------------
  // Game_Aura
  //
  // class for character's aura

  Game_Aura = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Aura.prototype = Object.create(Game_Event.prototype);
  Game_Aura.prototype.constructor = Game_Aura;

  Game_Aura.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.caster = src.caster;
  }

  Game_Aura.prototype.initStatus = function (event) {
    event.type = 'AURA';
  }

  Game_Aura.prototype.updateDataMap = function () {
    Game_Aura.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_Aura.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_Aura.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // find empty space for new event
      var eventId = MapUtils.findEmptyFromList($dataMap.events);
      $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.aura, eventId, x, y);
      this.initStatus($dataMap.events[eventId]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    this.name = '光環';
    $gameMap._events[eventId] = this;
  };

  //-----------------------------------------------------------------------------------
  // Aura_Fire

  Aura_Fire = function () {
    this.initialize.apply(this, arguments);
  }

  Aura_Fire.prototype = Object.create(Game_Aura.prototype);
  Aura_Fire.prototype.constructor = Aura_Fire;

  Aura_Fire.prototype.initialize = function (x, y, fromData) {
    Game_Aura.prototype.initialize.call(this, x, y, fromData);
    // setup image
    this._originalPattern = 1;
    this.setPattern(1);
    this.setDirection(2);
    this.setImage('!Door2', 0);
    this.setOpacity(128);
    this.name = '火焰光環';
  }

  //-----------------------------------------------------------------------------------
  // Game_Terrain
  //
  // class for terrain effect

  Game_Terrain = function () {
    this.initialize.apply(this, arguments);
  }

  Game_Terrain.prototype = Object.create(Game_Event.prototype);
  Game_Terrain.prototype.constructor = Game_Terrain;

  Game_Terrain.prototype.fromEvent = function (src, target) {
    target.type = src.type;
    target.x = src.x;
    target.y = src.y;
    target.evt = src.evt;
  }

  Game_Terrain.prototype.initStatus = function (event) {
    event.type = 'TERRAIN';
  }

  Game_Terrain.prototype.updateDataMap = function () {
    Game_Terrain.prototype.fromEvent(this, $dataMap.events[this._eventId]);
  }

  Game_Terrain.prototype.initialize = function (x, y, fromData) {
    var eventId = -1;
    if (fromData) {
      for (var i = 1; i < $dataMap.events.length; i++) {
        if ($dataMap.events[i] && $dataMap.events[i] == fromData) {
          eventId = i;
          Game_Terrain.prototype.fromEvent($dataMap.events[i], this);
          break;
        }
      }
    } else {
      // find empty space for new event
      var eventId = MapUtils.findEmptyFromList($dataMap.events);
      $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents.terrain, eventId, x, y);
      this.initStatus($dataMap.events[eventId]);
      this.initStatus(this);
    }
    // store new events back to map variable
    $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
    Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
    this.name = '地形效果';
    $gameMap._events[eventId] = this;
    // event image setup
    this._originalPattern = 1;
    this.setPattern(1);
    this.setDirection(2);
    this.setOpacity(128);
    // deal with event scheduler
    if (this.evt.damage && this.evt.expire) {
      // check if terrain already disappear
      if (this.evt.expire < $gameVariables[0].gameTime) {
        // move it to unreachable place, because event initialization is done
        // before TimeUtils.eventScheduler.execute(), cause player can be damaged
        // by terrain effect in the past
        this.setPosition(-10, -10);
      }
      TimeUtils.eventScheduler.insertEvent(new ScheduleEvent(this, this.evt.expire));
    }
  };

  //-----------------------------------------------------------------------------------
  // Terrain_Fire
  //
  // must assign damage after new object

  Terrain_Fire = function () {
    this.initialize.apply(this, arguments);
  }

  Terrain_Fire.prototype = Object.create(Game_Terrain.prototype);
  Terrain_Fire.prototype.constructor = Terrain_Fire;

  Terrain_Fire.prototype.initStatus = function(event) {
    Game_Terrain.prototype.initStatus.call(this, event);
    
    event.evt = {
      name: '火焰',
      className: 'Terrain_Fire'
    }
  }

  Terrain_Fire.prototype.initialize = function (x, y, fromData) {
    Game_Terrain.prototype.initialize.call(this, x, y, fromData);
    // setup image
    this.setImage('!Flame', 3);
  }

  //-----------------------------------------------------------------------------------
  // Terrain_DarkFire
  //
  // must assign damage after new object

  Terrain_DarkFire = function () {
    this.initialize.apply(this, arguments);
  }

  Terrain_DarkFire.prototype = Object.create(Game_Terrain.prototype);
  Terrain_DarkFire.prototype.constructor = Terrain_DarkFire;

  Terrain_DarkFire.generate = function(x, y) {
    let terrainEvt = new Terrain_DarkFire(x, y);
    terrainEvt.evt.damage = 8;
    terrainEvt.evt.expire = $gameVariables[0].gameTime + 2000;
    terrainEvt.updateDataMap();
    TimeUtils.eventScheduler.insertEvent(new ScheduleEvent(terrainEvt, terrainEvt.evt.expire));
  }

  Terrain_DarkFire.prototype.initStatus = function(event) {
    Game_Terrain.prototype.initStatus.call(this, event);
    
    event.evt = {
      name: '闇炎',
      className: 'Terrain_DarkFire'
    }
  }

  Terrain_DarkFire.prototype.initialize = function (x, y, fromData) {
    Game_Terrain.prototype.initialize.call(this, x, y, fromData);
    // setup image
    this.setImage('!Flame2', 3);
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
    target.lastStatus = src.lastStatus;
  }

  Game_Door.prototype.initStatus = function (event) {
    event.type = 'DOOR';
    // 0: locked, 1: closed, 2: opened
    event.status = 1;
    event.lastStatus = 1; // for player's information
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
    if (character == $gamePlayer || CharUtils.playerCanSeeBlock(x, y)) {
      door.lastStatus = 2;
    }
    if (character == $gamePlayer && $gameActors.actor(1).status.blindEffect.turns > 0) {
      MapUtils.drawDoorWhenBlind(x, y);
    }
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], true);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    AudioManager.playSe({name: 'Open1', pan: 0, pitch: 100, volume: 100});
    if (CharUtils.playerCanSeeBlock(x, y)) {
      if (CharUtils.playerCanSeeChar(character)) {
        let realTarget = BattleUtils.getRealTarget(character);
        LogUtils.addLog(String.format(Message.display('openDoor'), LogUtils.getCharName(realTarget)));
      } else {
        LogUtils.addLog(Message.display('seeDoorOpen'));
      }
    } else {
      LogUtils.addLog(Message.display('hearDoorOpen'));
    }
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
    if (character == $gamePlayer || CharUtils.playerCanSeeBlock(x, y)) {
      door.lastStatus = 1;
    }
    if (character == $gamePlayer && $gameActors.actor(1).status.blindEffect.turns > 0) {
      MapUtils.drawDoorWhenBlind(x, y);
    }
    $gameSelfSwitches.setValue([$gameMap.mapId(), door._eventId, 'A'], false);
    door.updateDataMap();
    $gameVariables[0].messageFlag = false;
    SceneManager._scene.removeChild(messageWindow);
    AudioManager.playSe({name: 'Close1', pan: 0, pitch: 100, volume: 100});
    if (CharUtils.playerCanSeeBlock(x, y)) {
      if (CharUtils.playerCanSeeChar(character)) {
        let realTarget = BattleUtils.getRealTarget(character);
        LogUtils.addLog(String.format(Message.display('closeDoor'), LogUtils.getCharName(realTarget)));
      } else {
        LogUtils.addLog(Message.display('seeDoorClose'));
      }
    } else {
      LogUtils.addLog(Message.display('hearDoorClose'));
    }
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
    event.type = 'PROJECTILE';
    event.mob = {
      name: function() {
        return this._name;
      }
    }
    event.mob.status = CharUtils.initStatus();
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
    this.directionX = x - src._x;
    this.directionY = y - src._y;
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
    this.vanish = false;
    TimeUtils.actionDone = false;
    let vm = this;
    this.shadows = []; // for ray situation
    let func = function() {
      if (vm.distanceCount < vm.distance) {
        vm.distanceCount++;
        if (vm.projectileData && vm.projectileData.isRay) {
          let evt = new Game_Projectile(vm, vm._x, vm._y);
          let imageData = vm.projectileData.imageData;
          evt._originalPattern = imageData.pattern;
          evt.setPattern(imageData.pattern);
          evt._direction = imageData.direction;
          evt.setImage(imageData.image, imageData.imageIndex);
          vm.shadows.push(evt);
        }
        vm.setPosition(vm._x + vm.directionX, vm._y + vm.directionY);
        if ($gamePlayer.pos(vm._x, vm._y)) {
          vm.vanish = vm.hitCharacter(vm, $gamePlayer);
        } else {
          let events = $gameMap.eventsXy(vm._x, vm._y);
          for (let id in events) {
            let evt = events[id];
            if (evt.type == 'DOOR' && evt.status != 2) { // hit closed door
              vm.vanish = vm.hitDoor(vm);
            } else if ($gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(vm._x, vm._y)]
              && !$gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(vm._x, vm._y)].isRevealed) {
              // secret door not revealed yet
              vm.vanish = vm.hitDoor(vm);
            } else if (evt.type == 'MOB') { // hit character
              vm.vanish = vm.hitCharacter(vm, evt);
            } else if (evt.type == 'TRAP' && evt instanceof Trap_Teleport) {
              vm.vanish = vm.hitTeleportTrap(vm, evt);
            }
          }
        }
        // hit wall
        if (!vm.vanish && MapDataUtils.getOriginalTile($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y]) == WALL) {
          vm.vanish = vm.hitWall(vm);
        }
        if (vm.vanish) {
          vm.afterAction();
          vm.removeEvent();
          TimeUtils.actionDone = true;
          return;
        }
        setTimeout(func, 50);
      } else {
        vm.afterAction();
        vm.removeEvent();
        TimeUtils.actionDone = true;
      }
    }
    func();
  }

  Game_Projectile.prototype.hitCharacter = function(vm, evt) {
    return true;
  }

  Game_Projectile.prototype.hitDoor = function(vm) {
    return true;
  }

  Game_Projectile.prototype.hitWall = function(vm) {
    return true;
  }

  Game_Projectile.prototype.hitTeleportTrap = function(vm, trap) {
    trap.triggered(vm);
    return false;
  }

  // deal with checks with vanish
  Game_Projectile.prototype.afterAction = function() {
    // implements by each class
  }

  // remove event
  Game_Projectile.prototype.removeEvent = function() {
    if (this.projectileData && this.projectileData.isRay) {
      for (let i = 0; i < this.shadows.length; i++) {
        let evt = this.shadows[i];
        evt.setPosition(-10, -10);
        $gameMap._events[evt._eventId] = null;
        $dataMap.events[evt._eventId] = null;
      }
    }
    this.setPosition(-10, -10);
    $gameMap._events[this._eventId] = null;
    $dataMap.events[this._eventId] = null;
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
    projectile.mob._name = ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item);
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[src._x][src._y])) {
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
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Crash"));
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y])) {
      let realTarget = BattleUtils.getRealTarget(evt);
      LogUtils.addLog(String.format(Message.display('throwPotionHit')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)
        , LogUtils.getCharName(realTarget)));
    }
    $gameVariables[0].fireProjectileInfo.item.onQuaff(evt, true);
    return true;
  }

  Projectile_Potion.prototype.hitDoor = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Crash"));
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y])) {
      LogUtils.addLog(String.format(Message.display('throwPotionCrash')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
    return true;
  }

  Projectile_Potion.prototype.hitWall = function(vm) {
    return this.hitDoor(vm);
  }

  Projectile_Potion.prototype.afterAction = function() {
    if (!this.vanish) {
      this.hitDoor(this);
    }
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
    this.mob._name = projectileData.skill.name;
    let imageData = projectileData.imageData;
    this._originalPattern = imageData.pattern;
    this.setPattern(imageData.pattern);
    this._direction = imageData.direction;
    this.setImage(imageData.image, imageData.imageIndex);
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

  // TODO: need bug fix, no evt can be found
  Projectile_SingleTarget.prototype.hitWall = function(vm, evt) {
    Game_Projectile.prototype.hitWall.call(this, vm, evt);
    if (this.projectileData.hitWallFunc) {
      this.projectileData.hitWallFunc(vm, evt);
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Projectile_Ray
  //
  // projectile that sustains ray path, hit multiple targets

  Projectile_Ray = function () {
    this.initialize.apply(this, arguments);
  }

  Projectile_Ray.prototype = Object.create(Projectile_SingleTarget.prototype);
  Projectile_Ray.prototype.constructor = Projectile_Ray;

  Projectile_Ray.prototype.initialize = function (src, x, y, projectileData) {
    projectileData.isRay = true;
    Projectile_SingleTarget.prototype.initialize.call(this, src, x, y, projectileData);
  };

  Projectile_Ray.prototype.hitCharacter = function(vm, evt) {
    Projectile_SingleTarget.prototype.hitCharacter.call(this, vm, evt);
    return false;
  }

  //-----------------------------------------------------------------------------------
  // Projectile_Item

  Projectile_Item = function () {
    this.initialize.apply(this, arguments);
  }

  Projectile_Item.checkItemBroken = function(evt, x, y) {
    if (getRandomInt(100) < 90) {
      // check if hit lava
      if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x][y]) == LAVA) {
        AudioManager.playSe({name: 'Fire2', pan: 0, pitch: 100, volume: 100});
        LogUtils.addLog(String.format(Message.display('throwItemHitLava')
          , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
      } else {
        ItemUtils.addItemToItemPile(x, y, $gameVariables[0].fireProjectileInfo.item);
      }
    } else if (CharUtils.playerCanSeeBlock(x, y)) {
      AudioManager.playSe({name: 'Buzzer2', pan: 0, pitch: 100, volume: 100});
      LogUtils.addLog(String.format(Message.display('throwItemBroken')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
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
    projectile.mob._name = ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item);
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[src._x][src._y])) {
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

  Projectile_Item.prototype.hitCharacter = function(vm, evt) {
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Slash3"));
    BattleUtils.projectileAttack(vm.src, evt, $gameVariables[0].fireProjectileInfo.item);
    Projectile_Item.checkItemBroken(evt, evt._x, evt._y);
    return true;
  }

  Projectile_Item.prototype.hitDoor = function(vm) {
    TimeUtils.animeQueue.push(new AnimeObject(null, 'SE', "Sword1"));
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[vm._x][vm._y])) {
      LogUtils.addLog(String.format(Message.display('throwItemHitObstacle')
        , ItemUtils.getItemDisplayName($gameVariables[0].fireProjectileInfo.item)));
    }
    Projectile_Item.checkItemBroken(vm, this._x - this.directionX, this._y - this.directionY);
    return true;
  }

  Projectile_Item.prototype.hitWall = function(vm) {
    return this.hitDoor(vm);
  }

  Projectile_Item.prototype.afterAction = function() {
    if (!this.vanish) {
      Projectile_Item.checkItemBroken(this, this._x, this._y);
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
    // generate pre-defined traps
    for (let id in $gameVariables[mapId].preDefinedTraps) {
      let trapData = $gameVariables[mapId].preDefinedTraps[id];
      let trapClass = window[trapData.trapClassName];
      let trap = new trapClass(trapData.x, trapData.y);
      if (trap instanceof Trap_PressFloor) {
        trap.trap.relatedEventClassName = trapData.relatedEventClassName;
      }
    }
    // generate upsatir/downstair
    for (let id in $gameVariables[mapId].stairList) {
      let stairData = $gameVariables[mapId].stairList[id];
      if (1 == stairData.type) {
        new DownStair(stairData.x, stairData.y);
      } else {
        new UpStair(stairData.x, stairData.y);
      }
    }
    // generate traps
    if ($gameVariables[mapId].spawnTraps) {
      let trapCounts = Math.round(floors.length * trapSpawnPercentage);
      for (let i = 0; i < trapCounts; i++) {
        while (true) {
          let floor = floors[Math.randomInt(floors.length)];
          let floorX = MapDataUtils.getX(floor), floorY = MapDataUtils.getY(floor);
          if (MapUtils.isTileAvailableForMob(mapId, floorX, floorY)
            && TrapUtils.canPlaceTrap(mapId, floorX, floorY)) {
            let trapType = TrapUtils.trapTemplates[Math.randomInt(TrapUtils.trapTemplates.length)];
            new trapType(floorX, floorY);
            break;
          }
        }
      }
    }
  }

  TrapUtils.checkTrapStepped = function(target) {
    if (target._x == -10 && target._y == -10) {
      // deleted event, ignore
      return;
    }
    let evts = $gameMap.eventsXy(target._x, target._y);
    for (let id in evts) {
      let evt = evts[id];
      if (evt.type == 'TRAP') {
        if (CharUtils.playerCanSeeChar(target)) {
          if (!evt.trap.isRevealed) {
            // tutorial: trap
            TimeUtils.tutorialHandler.queue.push('trap');
          } else if (evt instanceof DownStair) {
            // tutorial: stair
            TimeUtils.tutorialHandler.queue.push('stair');
          }
          evt.trap.isRevealed = true;
        }
        if (evt.trap.lastTriggered != target) {
          evt.triggered(target);
        }
        break;
      }
    }
    // check if target in the water
    let realTarget = BattleUtils.getRealTarget(target);
    if (CharUtils.isCharInWater(target)
      && MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[target._x][target._y]) == WATER) {
      realTarget.status.wetEffect.turns = 10;
      TimeUtils.eventScheduler.addStatusEffect(target, 'wetEffect');
      // check if target adapts water
      let skill = SkillUtils.getSkillInstance(realTarget, Skill_AdaptWater);
      if (skill) {
        let index = skill.lv - 1;
        let prop = window[skill.constructor.name].prop;
        SkillUtils.gainSkillExp(realTarget, skill, prop.effect[index].levelUp);
      }
    }
    // check if target in the lava
    if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[target._x][target._y]) == LAVA
      && realTarget.moveType != 2) {
      let baseDamage = 40;
      if (realTarget.status.wetEffect.turns > 0) {
        // remove effect & reduce damage
        realTarget.status.wetEffect.turns = 1;
        baseDamage /= 2;
      }
      let value = Math.round(baseDamage * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.fire))
        * Skill_AdaptTerrain.getTerrainDamageMultiplier(realTarget));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 67));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      CharUtils.decreaseHp(realTarget, value);
      LogUtils.addLog(String.format(Message.display('lavaDamage'), LogUtils.getCharName(realTarget), value));
      BattleUtils.checkTargetAlive(null, realTarget, target);
    }
    // check if target on terrain effect
    let terrainEvt = $gameMap.eventsXy(target._x, target._y).filter(function(event) {
      return event.type == 'TERRAIN';
    })[0];
    if (terrainEvt) {
      if (terrainEvt instanceof Terrain_Fire && !CharUtils.getTargetEffect(realTarget, Skill_FirePath)) {
        // not using same skill, should take damage
        let damage = Math.round(terrainEvt.evt.damage
          * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.fire))
          * Skill_AdaptTerrain.getTerrainDamageMultiplier(realTarget));
        CharUtils.decreaseHp(realTarget, damage);
        if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
          TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 67));
          TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
          LogUtils.addLog(String.format(Message.display('terrainDamage'), LogUtils.getCharName(realTarget)
            , damage, terrainEvt.evt.name));
        }
        BattleUtils.checkTargetAlive(null, realTarget, target);
      } else if (terrainEvt instanceof Terrain_DarkFire && !(target instanceof SealKing)) {
        let damage = Math.round(terrainEvt.evt.damage
          * Skill_AdaptTerrain.getTerrainDamageMultiplier(realTarget));
        CharUtils.decreaseHp(realTarget, damage);
        if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
          TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 121));
          TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
          LogUtils.addLog(String.format(Message.display('terrainDamage'), LogUtils.getCharName(realTarget)
            , damage, terrainEvt.evt.name));
        }
        BattleUtils.checkTargetAlive(null, realTarget, target);
      }
    }
  }

  TrapUtils.updateLastTriggered = function() {
    let mapEvts = $gameMap.events();
    for (let id in mapEvts) {
      let mapEvt = mapEvts[id];
      if (mapEvt.type == 'TRAP') {
        if (mapEvt instanceof Trap_PressFloor) {
          if (MapUtils.isBolderOnTile(mapEvt._x, mapEvt._y) && !mapEvt.trap.lastTriggered) {
            mapEvt.trap.lastTriggered = true;
            mapEvt.enable();
          } else if (!MapUtils.isBolderOnTile(mapEvt._x, mapEvt._y) && mapEvt.trap.lastTriggered) {
            mapEvt.trap.lastTriggered = false;
            mapEvt.disable();
          }
        } else {
          let target = MapUtils.getCharXy(mapEvt._x, mapEvt._y);
          mapEvt.trap.lastTriggered = target;
        }
      }
    }
  }

  TrapUtils.drawTrap = function(event) {
    if (event.trap.isRevealed && MapDataUtils.getExplored($gameVariables[$gameMap._mapId].mapData[event._x][event._y])) {
      let imageData = event.trap.imageData;
      let opacity;
      if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[event._x][event._y])) {
        opacity = 255;
      } else {
        opacity = 128;
      }
      MapUtils.drawImage(event, imageData, opacity);
    }
    event.updateDataMap();
  }

  TrapUtils.canPlaceTrap = function(mapId, x, y) {
    if ((!MapUtils.isTilePassable(mapId, x - 1, y, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x - 1][y]))
      && !MapUtils.isTilePassable(mapId, x + 1, y, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x + 1][y])))
      || (!MapUtils.isTilePassable(mapId, x, y - 1, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y - 1]))
      && !MapUtils.isTilePassable(mapId, x, y + 1, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y + 1])))) {
      return false;
    }
    return true;
  }

  TrapUtils.getMapTrap = function(x, y) {
    return $gameMap.eventsXy(x, y).filter(function(evt) {
      return evt.type && evt.type == 'TRAP';
    })[0];
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
    if (realTarget.moveType == 2) {
      if (CharUtils.playerCanSeeChar(target)) {
        LogUtils.addLog(String.format(Message.display('trapFloated')
          , LogUtils.getCharName(realTarget), this.trap.name));
      }
      return;
    }
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
      this.trap.isRevealed = true;
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
    if (realTarget.moveType != 2) {
      CharUtils.decreaseHp(realTarget, damage);
      realTarget.status.groundHoleTrapped = true;
      if (CharUtils.playerCanSeeChar(target)) {
        AudioManager.playSe({name: 'Damage3', pan: 0, pitch: 100, volume: 100});
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('groundHoleTrapTriggered')
          , LogUtils.getCharName(realTarget), damage));
      }
    } else if (CharUtils.playerCanSeeChar(target)) {
      LogUtils.addLog(String.format(Message.display('trapFloated')
      , LogUtils.getCharName(realTarget), this.trap.name));
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
    this.trap.imagePool = {
      disabled: new ImageData('!Door1', 0, 0, 8),
      enabled: new ImageData('!Door2', 0, 1, 8)
    }
    this.trap.imageData = this.trap.imagePool.disabled;
    this.trap.isEnabled = false;
    this.trap.name = '傳送門';
    this.trap.isRevealed = true;
  }

  Trap_GoHome.prototype.triggered = function(target) {
    if (target == $gamePlayer && this.trap.isEnabled) {
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.goHome);
    }
  }

  Trap_GoHome.prototype.enable = function() {
    this.trap.isEnabled = true;
    this.trap.imageData = this.trap.imagePool.enabled;
  }

  Trap_GoHome.prototype.disable = function() {
    this.trap.isEnabled = false;
    this.trap.imageData = this.trap.imagePool.disabled;
  }

  //-----------------------------------------------------------------------------------
  // Trap_PressFloor
  //
  // class for test event: Howard go home

  Trap_PressFloor = function () {
    this.initialize.apply(this, arguments);
  }

  Trap_PressFloor.prototype = Object.create(Game_Trap.prototype);
  Trap_PressFloor.prototype.constructor = Trap_PressFloor;

  Trap_PressFloor.prototype.initStatus = function (event) {
    Game_Trap.prototype.initStatus.call(this, event);
    this.trap.trapClass = 'Trap_PressFloor';
    this.trap.imageData = new ImageData('!Door1', 0, 0, 8);
    this.trap.relatedEventClassName = null;
    this.trap.relatedEvent = null;
    this.trap.name = '壓力板';
    this.trap.isRevealed = true;
  }

  Trap_PressFloor.prototype.triggered = function(target) {
    if (target == $gamePlayer && !$gameVariables[0].eventState.pressFloorDiscovered) {
      $gameVariables[0].eventState.pressFloorDiscovered = true;
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.discoverPressFloor);
    }
  }

  Trap_PressFloor.prototype.enable = function() {
    AudioManager.playSe({name: 'Switch1', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(Message.display('pressFloorTriggered'));
    if (!this.trap.relatedEvent) {
      let eventClassName = this.trap.relatedEventClassName;
      this.trap.relatedEvent = $gameMap.events().filter(function(evt) {
        return evt instanceof window[eventClassName];
      })[0];
    }
    this.trap.relatedEvent.enable();
  }

  Trap_PressFloor.prototype.disable = function() {
    AudioManager.playSe({name: 'Switch1', pan: 0, pitch: 100, volume: 100});
    LogUtils.addLog(Message.display('pressFloorTriggered'));
    this.trap.relatedEvent.disable();
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
          player.moved = $gameVariables[0].directionalAction($gamePlayer, x, y);
        }
        // check if player moved
        if (player.moved) {
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
      // check carry status
      let moveStatus = 0; // 0: normal, 1: overloaded, 2: groundHoleTrapped
      if (player.carryStatus == 4) {
        switch (event.code) {
          case 'Numpad8': case 'ArrowUp': case 'Numpad2': case 'ArrowDown': case 'Numpad4': case 'ArrowLeft':
          case 'Numpad6': case 'ArrowRight': case 'Numpad7': case 'Home': case 'Numpad9': case 'PageUp':
          case 'Numpad1': case 'End': case 'Numpad3': case 'PageDown':
            moveStatus = 1;
            break;
        }
        // check hotkeys
        let prefix = 'Digit';
        for (let i = 0; i < 10; i++) {
          if (event.code == prefix + i) {
            moveStatus = 1;
            break;
          }
        }
        switch (event.key) {
          case 'Enter': case '>': case '<': case 'g': case 'o': case 'c': case 'w': case 'e': case 'f':
          case 'q': case 'r': case 's': case 'W': case 'C': case 'M': case 'z': case 'Z': case ' ': case 'k':
          case 'F':
            moveStatus = 1;
            break;
        }
      } else if (player.status.groundHoleTrapped) {
        // check hotkeys
        let prefix = 'Digit';
        for (let i = 0; i < 10; i++) {
          if (event.code == prefix + i) {
            moveStatus = 2;
            break;
          }
        }
        switch (event.key) {
          case 'o': case 'c': case 'f': case 's': case 'W': case 'C': case 'z': case 'Z': case ' ': case 'Enter':
          case 'k': case 'F':
            moveStatus = 2;
            break;
        }
      }
      if (moveStatus == 0) {
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
          case 'Numpad5': // wait action
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
              player.moved = true;
            } else {
              MapUtils.displayMessage(Message.display('noStairUp'));
            }
            break;
          case 'g': // pick things up from the ground
            let itemPile = ItemUtils.findMapItemPileEvent($gamePlayer._x, $gamePlayer._y);
            if (itemPile) {
              if (ItemUtils.getPlayerInventoryStackNum() >= carryObjectMaxNum) {
                MapUtils.addBothLog(Message.display('getItemFailedMaxNum'));
              } else {
                if (itemPile.itemPile.objectStack.length == 1) {
                  let obj = itemPile.itemPile.objectStack[0];
                  // check tutorial
                  TimeUtils.tutorialHandler.addTutorialWhenGet(obj);
                  ItemUtils.removeItemFromItemPile($gamePlayer._x, $gamePlayer._y, obj);
                  $gameParty.gainItem(obj, 1);
                  LogUtils.addLog(String.format(Message.display('getItems'), ItemUtils.getItemDisplayName(obj)));
                  TimeUtils.afterPlayerMoved();
                } else {
                  SceneManager.push(Scene_GetItem);
                }
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
          case 'k': // kick a direction (only performed by player)
            if ($gameActors.actor(1).status.legWoundedEffect.turns > 0) {
              MapUtils.displayMessage(Message.display('tryKickWhenLegWounded'));
              break;
            }
            if ($gameActors.actor(1)._tp < attackTpCost) {
              MapUtils.displayMessage(Message.display('noEnergy'));
              break;
            }
            $gameVariables[0].directionalAction = function(character, x, y) {
              if ($gamePlayer.pos(x, y)) {
                MapUtils.displayMessage(Message.display('kickSelf'));
                return false;
              }
              let kickDone = false;
              let realSrc = BattleUtils.getRealTarget(character);
              CharUtils.decreaseTp(realSrc, attackTpCost);
              realSrc.attacked = true;
              let originalTile = MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x][y]);
              if (originalTile == WALL) {
                let damage = dice(1, 4);
                CharUtils.decreaseHp(realSrc, damage);
                LogUtils.addLog(String.format(Message.display('kickWall'), damage));
                TimeUtils.animeQueue.push(new AnimeObject(character, 'ANIME', 1));
                TimeUtils.animeQueue.push(new AnimeObject(character, 'POP_UP', damage * -1));
                if (Math.random() < 0.33) {
                  LogUtils.addLog(Message.display('legWounded'));
                  realSrc.status.legWoundedEffect.turns = 10;
                  TimeUtils.eventScheduler.addStatusEffect($gamePlayer, 'legWoundedEffect');
                }
                BattleUtils.checkTargetAlive(realSrc, realSrc, character);
                kickDone = true;
              } else if (originalTile == DOOR) {
                let doorEvt = $gameMap.eventsXy(x, y).filter(function(evt) {
                  return evt.type == 'DOOR';
                })[0];
                // visible door
                if (doorEvt) {
                  if (doorEvt.status == 1) {
                    TimeUtils.animeQueue.push(new AnimeObject(doorEvt, 'ANIME', 11));
                    doorEvt.status = 2;
                    doorEvt.lastStatus = 2;
                    $gameSelfSwitches.setValue([$gameMap.mapId(), doorEvt._eventId, 'A'], true);
                    doorEvt.updateDataMap();
                    LogUtils.addLog(Message.display('kickVisibleDoor'));
                    kickDone = true;
                  }
                } else {
                  // kick into hidden door
                  $gameVariables[$gameMap._mapId]
                    .secretBlocks[MapUtils.getTileIndex(x, y)].isRevealed = true;
                  MapUtils.updateAdjacentTiles(x, y);
                  doorEvt = new Game_Door(x, y);
                  doorEvt.status = 2;
                  doorEvt.lastStatus = 2;
                  $gameSelfSwitches.setValue([$gameMap.mapId(), doorEvt._eventId, 'A'], true);
                  doorEvt.updateDataMap();
                  LogUtils.addLog(Message.display('kickInvisibleDoor'));
                  TimeUtils.animeQueue.push(new AnimeObject(doorEvt, 'ANIME', 11));
                  kickDone = true;
                }
              } else {
                let mobEvt = $gameMap.eventsXy(x, y).filter(function(evt) {
                  return evt.type == 'MOB';
                })[0];
                if (mobEvt) {
                  let realTarget = BattleUtils.getRealTarget(mobEvt);
                  let damage = dice(1, 4);
                  TimeUtils.animeQueue.push(new AnimeObject(mobEvt, 'ANIME', 1));
                  TimeUtils.animeQueue.push(new AnimeObject(mobEvt, 'POP_UP', damage * -1));
                  LogUtils.addLog(String.format(Message.display('kickEnemy')
                    , LogUtils.getCharName(realTarget), damage));
                  CharUtils.decreaseHp(realTarget, damage);
                  BattleUtils.checkTargetAlive(realSrc, realTarget, mobEvt);
                  kickDone = true;
                }
              }
              // check if kicked on something
              if (kickDone) {
                CharUtils.playerGainStrExp(1);
              } else {
                AudioManager.playSe({name: 'Jump1', pan: 0, pitch: 100, volume: 100});
                LogUtils.addLog(Message.display('kickAir'));
                LogUtils.addLog(Message.display('legWounded'));
                realSrc.status.legWoundedEffect.turns = 10;
                TimeUtils.eventScheduler.addStatusEffect($gamePlayer, 'legWoundedEffect');
              }
              return true;
            }
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
          case 'F': // melee attack
            $gameVariables[0].directionalAction = BattleUtils.checkMeleeAttack;
            $gameVariables[0].directionalFlag = true;
            MapUtils.displayMessage(Message.display('askDirection'));
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
                  if (MapDataUtils.getOriginalTile($gameVariables[$gameMap._mapId].mapData[coordinate.x][coordinate.y]) == DOOR) {
                    MapUtils.updateAdjacentTiles(coordinate.x, coordinate.y);
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
            SceneManager.push(Scene_Help);
            break;
          case '.': // wait action
            TimeUtils.afterPlayerMoved();
            break;
        }
      } else if (moveStatus == 1) {
        MapUtils.displayMessage(Message.display('actionBlockedOverloaded'));
      } else if (moveStatus == 2) {
        MapUtils.displayMessage(Message.display('moveFailedInGroundHole'));
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

  TimeUtils.eventScheduler = {
    getEventQueue: function() {
      return $gameVariables[0].eventQueue;
    },
    insertEvent: function(scheduleEvent) {
      let index = 0;
      for (; index < this.getEventQueue().length; index++) {
        if (this.getEventQueue()[index].execTime > scheduleEvent.execTime) {
          break;
        }
      }
      this.getEventQueue().splice(index, 0, scheduleEvent);
    },
    removeEvent: function(target, skillEffect) {
      if (skillEffect) {
        for (let id in this.getEventQueue()) {
          let evt = this.getEventQueue()[id];
          if (evt.target == target && evt.skillEffect == skillEffect) {
            this.getEventQueue().splice(id, 1);
            break;
          }
        }
      } else {
        // remove all target related events
        for (let i = this.getEventQueue().length - 1; i >= 0; i--) {
          if (this.getEventQueue()[i].target == target) {
            this.getEventQueue().splice(i, 1);
          }
        }
      }
    },
    queryEvent: function(target, statusName, skillEffect) {
      if (statusName) {
        for (let id in this.getEventQueue()) {
          let evt = this.getEventQueue()[id];
          if (evt.target == target && evt.statusName == statusName) {
            return evt;
          }
        }
      } else if (skillEffect) {
        for (let id in this.getEventQueue()) {
          let evt = this.getEventQueue()[id];
          if (evt.target == target && evt.skillEffect == skillEffect) {
            return evt;
          }
        }
      } else {
        for (let id in this.getEventQueue()) {
          let evt = this.getEventQueue()[id];
          if (evt.target == target && !evt.statusName && !evt.skillEffect) {
            return evt;
          }
        }
      }
      return null;
    },
    addStatusEffect: function(target, statusName) {
      let evt = this.queryEvent(target, statusName);
      if (!evt) {
        let realTarget = BattleUtils.getRealTarget(target);
        this.insertEvent(new ScheduleEvent(target, $gameVariables[0].gameTime + CharUtils.getActionTime(realTarget)
          , statusName, null));
      }
    },
    addSkillEffect: function(target, skillEffect) {
      // only add new effect, left remove to each skill action
      let realTarget = BattleUtils.getRealTarget(target);
      this.insertEvent(new ScheduleEvent(target, $gameVariables[0].gameTime + CharUtils.getActionTime(realTarget)
        , null, skillEffect));
    },
    clearEventExceptPlayer: function() {
      // also save mob status/effect events for recovery
      let eventQueue = this.getEventQueue();
      for (let i = eventQueue.length; i > 0; i--) {
        let evt = eventQueue[i - 1];
        if (evt.target != $gamePlayer) {
          if (evt.statusName || evt.skillEffect || evt.target instanceof IceBolder) {
            $gameVariables[$gameMap.mapId()].mobStatusEffectList.push(evt);
          }
          eventQueue.splice(i - 1, 1);
        }
      }
    },
    extractTargetEffects: function(x, y, mapId) {
      let effectsList = $gameVariables[mapId].mobStatusEffectList;
      let result = [];
      for (let i = effectsList.length; i > 0; i--) {
        let evt = effectsList[i - 1];
        if (evt.target._x == x && evt.target._y == y) {
          if (evt.statusName || evt.skillEffect) {
            result.push(evt);
            effectsList.splice(i - 1, 1);
          }
        }
      }
      return result;
    },
    restoreMobStatusEffect: function() {
      for (let id in $gameVariables[$gameMap.mapId()].mobStatusEffectList) {
        let evt = $gameVariables[$gameMap.mapId()].mobStatusEffectList[id];
        // re-assign target because target always newed whenever a different map is loaded
        let oldTarget = evt.target;
        if (oldTarget instanceof IceBolder) {
          evt.target = $gameMap.eventsXy(oldTarget._x, oldTarget._y).filter(function(evt) {
            return evt.type && evt.type == 'BOLDER';
          })[0];
        } else {
          evt.target = MapUtils.getCharXy(oldTarget._x, oldTarget._y);
        }
        if (!evt.target) {
          console.log('error! target should not be null!');
          console.log(evt.target.error);
        }
        TimeUtils.eventScheduler.insertEvent(evt);
      }
      $gameVariables[$gameMap.mapId()].mobStatusEffectList.length = 0;
    },
    execute: function() {
      if (this.getEventQueue().length > 0) {
        let event = this.getEventQueue()[0];
        let target = event.target;
        this.getEventQueue().splice(0, 1);
        // do not update gameTime if execTime is past
        $gameVariables[0].gameTime = ($gameVariables[0].gameTime > event.execTime)
          ? $gameVariables[0].gameTime : event.execTime;
        if (event.statusName) {
          let realTarget = BattleUtils.getRealTarget(target);
          if (realTarget._hp > 0) {
            CharUtils.updateStatus(target, event.statusName, null);
            if (realTarget.status[event.statusName].turns > 0) {
              // check if effect sustains because of terrain effect, may cause 
              // crash when player come back to this map after a long long time
              // because the system tries to catch up all those time. And then 
              // stack overflow happened.
              // This bug is caused by javascript asynchronize function structure,
              // so we need to try to avoid it.
              let nextScheduleTime = event.execTime + CharUtils.getActionTime(realTarget);
              let playerEvt = this.queryEvent($gamePlayer);
              if (playerEvt.execTime - event.execTime > 1000) {
                if (event.statusName == 'wetEffect' && CharUtils.isCharInWater(event.target)) {
                  // char in water, effect not gonna to go away
                  nextScheduleTime = playerEvt.execTime;
                }
              }
              this.insertEvent(new ScheduleEvent(target, nextScheduleTime, event.statusName, null));
            }
          }
          TimeUtils.afterPlayerMoved();
        } else if (event.skillEffect) {
          let realTarget = BattleUtils.getRealTarget(target);
          if (realTarget._hp > 0) {
            CharUtils.updateStatus(target, null, event.skillEffect);
            if (event.skillEffect.effectCount > 0) {
              // check if effect sustains
              let nextScheduleTime = event.execTime + CharUtils.getActionTime(realTarget);
              let playerEvt = this.queryEvent($gamePlayer);
              if (playerEvt.execTime - event.execTime > 1000) {
                if (event.skillEffect instanceof SkillEffect_Aura) {
                  // skip effect check
                  nextScheduleTime = playerEvt.execTime;
                }
              }
              this.insertEvent(new ScheduleEvent(target, nextScheduleTime, null, event.skillEffect));
            }
          }
          TimeUtils.afterPlayerMoved();
        } else if (target == $gamePlayer) {
          if ($gameActors.actor(1).turnCount >= 500) {
            // tutorial: save
            TimeUtils.tutorialHandler.queue.push('save');
          }
          if ($gameActors.actor(1).turnCount % regenTurnCount == 0) {
            CharUtils.regenerate($gamePlayer);
          }
          if (CharUtils.getTargetEffect($gameActors.actor(1), Skill_SuperRegen)) {
            let regenValue = Math.round(1 + $gameActors.actor(1).param(3) / 3);
            regenValue = getRandomIntRange(1, regenValue);
            $gameActors.actor(1).gainHp(Math.round(regenValue / 2));
            $gameActors.actor(1).nutrition -= Math.round(regenTurnCount / 2);
          }
          if ($gameActors.actor(1).status.paralyzeEffect.turns > 0 || $gameActors.actor(1).status.sleepEffect.turns > 0
            || $gameActors.actor(1).status.faintEffect.turns > 0) {
            TimeUtils.afterPlayerMovedData.state = 0;
          } else {
            TimeUtils.afterPlayerMovedData.state = 3;
          }
          TimeUtils.afterPlayerMoved();
        } else if (target.type == 'MOB') {
          TimeUtils.afterPlayerMovedData.currentEvent = target;
          TimeUtils.afterPlayerMovedData.done = false;
          target.mob.lastTimeMoved = event.execTime;
          target.mob.turnCount++;
          if (target.mob.turnCount % regenTurnCount == 0) {
            CharUtils.regenerate(target);
          }
          if (CharUtils.getTargetEffect(target.mob, Skill_SuperRegen)) {
            let regenValue = Math.round(1 + target.mob.param(3) / 3);
            regenValue = getRandomIntRange(1, regenValue);
            target.mob.gainHp(Math.round(regenValue / 2));
          }
          // schedule next turn event
          this.insertEvent(new ScheduleEvent(target
            , event.execTime + CharUtils.getActionTime(target.mob)));
          TimeUtils.afterPlayerMovedData.state = 2;
          target.action();
        } else if (target instanceof IceBolder) {
          IceBolder.melt(target);
          TimeUtils.afterPlayerMoved();
        } else if (target.type == 'TERRAIN') {
          // remove terrain effect
          target.setPosition(-10, -10);
          $gameMap._events[target._eventId] = null;
          $dataMap.events[target._eventId] = null;
          MapUtils.refreshMap();
          TimeUtils.afterPlayerMoved();
        }
      } else {
        console.log('ERROR: schedule problem!');
      }
    }
  };

  TimeUtils.tutorialHandler = {
    queue: [],
    msg: '',
    indicator: 0,
    execute: function() {
      let vm = TimeUtils.tutorialHandler;
      // handle game message
      if (vm.msg != '') {
        $gameMessage.add(vm.msg);
        $gameMap._interpreter.setWaitMode('message');
        vm.msg = '';
      }
      if ($gameVariables[0].tutorialOn) {
        if ($gameMap._interpreter._eventId != 0) {
          setTimeout(TimeUtils.tutorialHandler.execute, 10);
          return;
        }
        if (vm.indicator < vm.queue.length) {
          let tutorialEvt = $gameVariables[0].tutorialEvents[vm.queue[vm.indicator]];
          if (!tutorialEvt.triggered) {
            tutorialEvt.triggered = true;
            MapUtils.playEventFromTemplate(tutorialEvt.evtId);
          }
          vm.indicator++;
          vm.execute();
        } else {
          vm.indicator = 0;
          vm.queue.length = 0;
        }
      } else {
        vm.queue.length = 0;
      }
    },
    display: function(messageName) {
      $gameMessage.setFaceImage('Nature', 5);
      $gameMessage.add(Message.display('tutorialGuide') + ':');
      $gameMessage.add(Message.display(messageName));
      $gameMap._interpreter.setWaitMode('message');
    },
    addTutorialWhenGet: function(item) {
      // tutorial: inventory
      TimeUtils.tutorialHandler.queue.push("inventory");
      if (DataManager.isWeapon(item) || DataManager.isArmor(item)) {
        // tutorial: equip
        TimeUtils.tutorialHandler.queue.push("equip");
        if (DataManager.isWeapon(item)) {
          // tutorial: weapon
          TimeUtils.tutorialHandler.queue.push("weapon");
        }
      } else {
        let prop = JSON.parse(item.note);
        switch (prop.type) {
          case 'SCROLL':
            // tutorial: scroll
            TimeUtils.tutorialHandler.queue.push("scroll");
            break;
          case 'POTION':
            // tutorial: potion
            TimeUtils.tutorialHandler.queue.push("potion");
            break;
          case 'FOOD':
            // tutorial: belly
            TimeUtils.tutorialHandler.queue.push("belly");
            break;
          case 'MATERIAL':
            // tutorial: mix
            TimeUtils.tutorialHandler.queue.push("mix");
            break;
          case 'DART':
            // tutorial: dart
            TimeUtils.tutorialHandler.queue.push("dart");
            break;
        }
      }
    }
  };

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
    if (!$gameVariables[0].projectileMoving && SceneManager.isCurrentSceneStarted()) {
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
    currentEvent: null,
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
        if (!TimeUtils.actionDone || !$dataMap) { // block situation that $dataMap not ready yet
          setTimeout(TimeUtils.afterPlayerMoved, 1);
          return;
        }
        // tutorial: move
        TimeUtils.tutorialHandler.queue.push("move");
        TimeUtils.tutorialHandler.queue.push("soul");

        if (!$gameVariables[0].skillObtainedHintFlag) {
          $gameVariables[0].skillObtainedHintFlag = true;
          MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.skillObtainedHint);
        }

        CharUtils.decreaseNutrition($gamePlayer);
        CharUtils.calcPlayerCarryStatus();
        if (!timeSpent) {
          timeSpent = CharUtils.getActionTime(BattleUtils.getRealTarget($gamePlayer));
        }
        $gameActors.actor(1).lastTimeMoved = $gameVariables[0].gameTime;
        $gameActors.actor(1).turnCount++;
        TimeUtils.afterPlayerMovedData.timeSpent = timeSpent;
        // schedule next turn event
        TimeUtils.eventScheduler.insertEvent(new ScheduleEvent($gamePlayer
          , $gameVariables[0].gameTime + timeSpent));
        // check trap
        TrapUtils.checkTrapStepped($gamePlayer);
        TrapUtils.updateLastTriggered();

        // deal with energy calculation
        if (playerDashed) {
          // huge movement, do nothing
        } else {
          CharUtils.regenerateTp($gamePlayer);
        }

        // update food status
        ItemUtils.updateFoodStatus();
        TimeUtils.afterPlayerMovedData.state = 1;
      case 1:
        if ($gameVariables[0].gameTime % 400 < 10 && $gameVariables[$gameMap.mapId()].spawnMobs) {
          MapUtils.addMobToNowMap();
        }
        TimeUtils.eventScheduler.execute();
        return;
      case 2:
        if ($gameActors.actor(1)._hp <= 0) {
          // player died, stop mob action
          TimeUtils.afterPlayerMovedData.state = 3;
          return TimeUtils.afterPlayerMoved();
        }
        let event = TimeUtils.afterPlayerMovedData.currentEvent;
        // check trap
        TrapUtils.checkTrapStepped(event);
        TrapUtils.updateLastTriggered();
        CharUtils.regenerateTp(event);
        TimeUtils.afterPlayerMovedData.state = 1;
        return TimeUtils.afterPlayerMoved();
      case 3:
        // play queued anime
        TimeUtils.playAnime();
        TimeUtils.afterPlayerMovedData.state = 4;
      case 4:
        if (TimeUtils.isAnimePlaying) {
          // wait until animation done
          setTimeout(TimeUtils.afterPlayerMoved, 0);
          return;
        } else {
          MapUtils.refreshMap();

          $gameActors.actor(1).attacked = false;
          $gameActors.actor(1).moved = false;
          playerDashed = false;
          // player moveable again
          $gamePlayer._vehicleGettingOn = false;
          TimeUtils.afterPlayerMovedData.state = 0;
          // check door/secretDoor tutorial
          for (let i = 0; i < 8; i++) {
            let coordinate = MapUtils.getNearbyCoordinate($gamePlayer._x, $gamePlayer._y, i);
            if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]) == DOOR) {
              if ($gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(coordinate.x, coordinate.y)]
                && !$gameVariables[$gameMap._mapId].secretBlocks[MapUtils.getTileIndex(coordinate.x, coordinate.y)].isRevealed) {
                TimeUtils.tutorialHandler.queue.push('secretDoor');
              } else {
                TimeUtils.tutorialHandler.queue.push('door');
              }
            }
          }
          // run tutorial
          TimeUtils.tutorialHandler.execute();
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
  //             CharUtils.regenerateTp(event);
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
  //       CharUtils.regenerateTp($gamePlayer);
  //     }
  //     MapUtils.refreshMap();

  //     player.attacked = false;
  //     $gameActors.actor(1).moved = false;
  //     playerDashed = false;
  //   } while (player.status.paralyzeEffect.turns > 0 || player.status.sleepEffect.turns > 0
  //     || player.status.faintEffect.turns > 0); // check if player unable to move

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

  BattleUtils.getEventFromCharacter = function(realTarget) {
    if (realTarget == $gameActors.actor(1)) {
      return $gamePlayer;
    } else {
      for (let id in $gameMap._events) {
        let evt = $gameMap._events[id];
        if (evt && evt.mob == realTarget) {
          return evt;
        }
      }
    }
    return null;
  }

  // realSrc can be null, which means realTarget died on his own
  BattleUtils.checkTargetAlive = function(realSrc, realTarget, target) {
    if (realTarget._hp <= 0 && !realTarget.checked) {
      realTarget.checked = true;
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
        if (realSrc == $gameActors.actor(1)) {
          // tutorial: log
          TimeUtils.tutorialHandler.queue.push('log');
        }

        target.looting();
        if (realSrc == $gameActors.actor(1)) {
          let exp = Math.round(Soul_Chick.expAfterAmplify(realTarget.exp()));
          realSrc.gainExpLvGap(realTarget, exp);
        }
        // remove from scheduler
        TimeUtils.eventScheduler.removeEvent(target);
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

  BattleUtils.calcPhysicalDamage = function(realSrc, realTarget, atkValue) {
    if (realSrc == $gameActors.actor(1)) {
      CharUtils.playerGainStrExp(1);
    }
    switch (realSrc.carryStatus) {
      case 1:
        atkValue -= 1;
        break;
      case 2:
        atkValue -= 3;
        break;
      case 3: case 4:
        atkValue -= 5;
        break;
    }
    // calculate attack damage
    let attrDamage = (realSrc.level + realSrc.param(2)) * 2 / 3;
    let attrDef = (realTarget.level + realTarget.param(3)) / 3;
    let equipDef = realTarget.param(8);
    let damage = (atkValue + attrDamage - attrDef) * Math.pow(0.5, equipDef / 20);
    return BattleUtils.getFinalDamage(damage);
  }

  BattleUtils.calcMagicDamage = function(realSrc, realTarget, atkValue) {
    if (realSrc == $gameActors.actor(1)) {
      CharUtils.playerGainIntExp(1);
    }
    // calculate attack damage
    atkValue *= (1 + realSrc.param(4) / 100);
    let attrDamage = (realSrc.level + realSrc.param(4)) * 2 / 3;
    let attrDef = (realTarget.level + realTarget.param(5)) / 3;
    let equipDef = realTarget.param(9);
    let damage = (atkValue + attrDamage - attrDef) * Math.pow(0.5, equipDef / 10);
    return BattleUtils.getFinalDamage(damage);
  }

  BattleUtils.calcMeleeDamage = function(realSrc, realTarget, weaponBonus) {
    let weaponDamage = (BattleUtils.rollWeaponDamage(realSrc.param(10)) + weaponBonus) * (1 + realSrc.param(2) / 200);
    let physicalDamage = BattleUtils.calcPhysicalDamage(realSrc, realTarget, weaponDamage);
    let totalDamage = physicalDamage;
    for (let id in realSrc.status.damageType.elemental) {
      if (realSrc.status.damageType.elemental[id] > 0) {
        let magicDamage = realSrc.status.damageType.elemental[id] * physicalDamage;
        totalDamage += magicDamage * (1 - realTarget.status.resistance.elemental[id]);
      }
    }
    return Math.round(totalDamage);
  }

  BattleUtils.calcProjectileDamage = function(realSrc, realTarget, item, weaponBonus) {
    let weaponDamage = (BattleUtils.rollWeaponDamage(item.damage) + weaponBonus) * (1 + realSrc.param(2) / 200);
    return BattleUtils.calcPhysicalDamage(realSrc, realTarget, weaponDamage);
  }

  BattleUtils.getWeaponClass = function(realSrc) {
    let skillClass;
    if (realSrc._equips && realSrc._equips[0].itemId() != 0) {
      let prop = JSON.parse($dataWeapons[realSrc._equips[0].itemId()].note);
      // get weapon type
      switch (prop.subType) {
        case 'SCIMITAR':
          skillClass = Skill_Scimitar;
          break;
        case 'SPEAR':
          skillClass = Skill_Spear;
          break;
        case 'STAFF':
          skillClass = Skill_Staff;
          break;
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

  BattleUtils.meleeAttack = function (src, target, fromCmd) {
    var realSrc = BattleUtils.getRealTarget(src);
    if (realSrc._tp < attackTpCost) {
      if (src == $gamePlayer) {
        MapUtils.displayMessage(Message.display('noEnergy'));
      }
      return false;
    } else {
      CharUtils.decreaseTp(realSrc, attackTpCost);
      realSrc.attacked = true;
    }
    // check if target exists
    if (!target) {
      LogUtils.addLog(String.format(Message.display('meleeAttackAir'), LogUtils.getCharName(realSrc)));
      return true;
    }
    var realTarget = BattleUtils.getRealTarget(target);

    // calculate the damage
    let weaponBonus = 0;
    let weaponSkill = new Skill_MartialArt();
    if (realSrc == $gameActors.actor(1)) {
      weaponSkill = BattleUtils.getWeaponSkill(realSrc);
      if (!weaponSkill) {
        throw('player no weapon skill from weapon: ' + realSrc._equips[0].name);
      }
      weaponBonus = weaponSkill.getDamage();      
    }

    let value = BattleUtils.calcMeleeDamage(realSrc, realTarget, weaponBonus);
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
    let weapon;
    if (src == $gamePlayer) {
      weapon = $gameActors.actor(1).equips()[0];
    }
    if (weapon) {
      LogUtils.addLog(String.format(Message.display('meleeAttackWithWeapon'), LogUtils.getCharName(realSrc)
        , weapon.name, LogUtils.getCharName(realTarget), value));
    } else {
      LogUtils.addLog(String.format(Message.display('meleeAttack'), LogUtils.getCharName(realSrc)
      , LogUtils.getCharName(realTarget), value));
    }
    SkillUtils.gainSkillExp(realSrc, weaponSkill, SkillUtils.getWeaponSkillLevelUpExp(weaponSkill.lv));

    CharUtils.decreaseHp(realTarget, value);
    CharUtils.updatesleepEffectWhenHit(realTarget);
    // hit animation (depends on weapon class)
    switch (window[weaponSkill.constructor.name]) {
      case Skill_MartialArt:
        animeId = 16;
        // check if knock back
        if (getRandomInt(100) < weaponSkill.knockBackPercentage()) {
          let moveData = MapUtils.getDisplacementData(src._x, src._y, target._x, target._y);
          Skill_Charge.prepareData(src, target._x, target._y, moveData);
          Skill_Charge.knockBack(target, realTarget, Skill_Charge.data);
        }
        break;
      case Skill_Scimitar:
        animeId = 6;
        // check if bleeding
        if (getRandomInt(100) < weaponSkill.bleedingPercentage()) {
          Skill_Bite.bleeding(target, realTarget, weaponSkill.lv);
        }
        break;
      case Skill_Spear:
        animeId = 11;
        // check if break armor
        if (getRandomInt(100) < weaponSkill.breakArmorPercentage()) {
          Skill_Pierce.breakArmor(target, realTarget, weaponSkill.lv);
        }
        break;
      case Skill_Staff:
        animeId = 1;
        break;
    }
    TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', animeId));
    BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    if (src == $gamePlayer && !fromCmd) {
      TimeUtils.afterPlayerMoved();
    }
    return true;
  }

  BattleUtils.checkMeleeAttack = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    let mobEvt = MapUtils.getCharXy(x, y);
    let weaponClass = BattleUtils.getWeaponClass(realSrc);
    if (!mobEvt && MapUtils.isTileAvailableForMob($gameMap.mapId(), x, y) && weaponClass == Skill_Spear) {
      // check if next block contains mob
      let x2, y2;
      if (src._x > x) {
        x2 = x - 1;
      } else if (src._x < x) {
        x2 = x + 1;
      } else {
        x2 = x;
      }
      if (src._y > y) {
        y2 = y - 1;
      } else if (src._y < y) {
        y2 = y + 1;
      } else {
        y2 = y;
      }
      mobEvt = MapUtils.getCharXy(x2, y2);
    }
    return BattleUtils.meleeAttack(src, mobEvt, true);
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
        weaponBonus = weaponSkill.getDamage();
        weaponSkill.exp += Soul_Chick.expAfterAmplify(1);
        let lvUpExp = SkillUtils.getWeaponSkillLevelUpExp(weaponSkill.lv);
        if (lvUpExp != -1 && weaponSkill.exp >= lvUpExp) {
          let msg = String.format(Message.display('skillLevelUp'), weaponSkill.name);
          TimeUtils.tutorialHandler.msg += msg + '\n';
          LogUtils.addLog(msg);
          weaponSkill.lv++;
          weaponSkill.exp = 0;
        }
      } else {
        let newWeaponSkill = new skillClass();
        realSrc._skills.push(newWeaponSkill);
        newWeaponSkill.lv = 0;
        newWeaponSkill.exp = Soul_Chick.expAfterAmplify(1);
      }
    }

    let value = BattleUtils.calcProjectileDamage(realSrc, realTarget, item, weaponBonus);
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
    LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
      , item.name, LogUtils.getCharName(realTarget), value));
    CharUtils.decreaseHp(realTarget, value);
    CharUtils.updatesleepEffectWhenHit(realTarget);
    // hit animation
    TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 16));
    BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    return true;
  }

  BattleUtils.playerDied = function (msg) {
    $gameMessage.add(msg);
    var waitFunction = function () {
      if ($gameMessage.isBusy()) {
        setTimeout(waitFunction, 100);
      } else {
        SceneManager.push(Scene_Statistics);
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
  ItemUtils.lootingTemplates = new Array(3); // 0: earth, 1: ice, 2: fire
  for (let i = 0; i < ItemUtils.lootingTemplates.length; i++) {
    ItemUtils.lootingTemplates[i] = {
      skin: [],
      tooth: [],
      claw: [],
      bone: [],
      material: []
    }
  }
  ItemUtils.equipTemplates = new Array(3); // 0: earth, 1: ice, 2: fire
  for (let i = 0; i < ItemUtils.equipTemplates.length; i++) {
    ItemUtils.equipTemplates[i] = {
      helmet: [],
      gloves: [],
      shoes: [],
      shield: [],
      coat: [],
      weapon: []
    }
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
    msg = msg.substring(0, msg.length - 2);
    let resultArray = [], index = 0;
    for (let i = 0; i < msg.length; i++) {
      if (!resultArray[index]) {
        resultArray[index] = '';
      }
      resultArray[index] += msg.charAt(i);
      if (messageWindow.textWidth(resultArray[index]) > Graphics.width - 200) {
        index++;
      }
    }
    let result = '';
    for (let id in resultArray) {
      result += resultArray[id] + '\n';
    }
    return result.substring(0, result.length - 1);
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

  ItemUtils.addItemToListSorted = function(item, list) {
    for (let i = 0; i < list.length; i++) {
      if (ItemUtils.getItemFullName(list[i]) == ItemUtils.getItemFullName(item)) {
        list.splice(i, 0, item);
        return;
      }
    }
    list.push(item);
  }

  ItemUtils.addItemToSet = function (toAdd, itemSet, weaponSet, armorSet) {
    if (DataManager.isItem(toAdd)) {
      ItemUtils.addItemToListSorted(toAdd, itemSet);
    } else if (DataManager.isWeapon(toAdd)) {
      ItemUtils.addItemToListSorted(toAdd, weaponSet);
    } else if (DataManager.isArmor(toAdd)) {
      ItemUtils.addItemToListSorted(toAdd, armorSet);
    }
  }

  ItemUtils.getSetStackNum = function(itemSet, weaponSet, armorSet) {
    let result = 0;
    result += Window_ItemList.getClassifiedList(itemSet).filter(function(item) {
      return !item.constructor.name.contains('Soul');
    }).length;
    result += Window_ItemList.getClassifiedList(weaponSet).length;
    result += Window_ItemList.getClassifiedList(armorSet).length;
    return result;
  }

  ItemUtils.getPlayerInventoryStackNum = function() {
    let objList = $gameParty.allItems().filter(function (item) {
      return item && !item.constructor.name.contains('Soul');
    });
    return Window_ItemList.getClassifiedList(objList).length;
  }

  ItemUtils.addItemToItemPile = function (x, y, item) {
    // check if hit lava
    if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[x][y]) == LAVA) {
      AudioManager.playSe({name: 'Fire2', pan: 0, pitch: 100, volume: 100});
      LogUtils.addLog(String.format(Message.display('throwItemHitLava')
        , ItemUtils.getItemDisplayName(item)));
    } else {
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
      if (listToCheck[id] == item) {
        listToCheck.splice(id, 1);
        break;
      }
    }
    for (var id in itemPile.objectStack) {
      if (itemPile.objectStack[id] == item) {
        itemPile.objectStack.splice(id, 1);
        break;
      }
    }
    ItemUtils.updateItemPile(itemPileEvent);
  }

  ItemUtils.identifyObject = function(item) {
    let prop = JSON.parse(item.note);
    switch (prop.type) {
      case 'POTION': case 'SCROLL': case 'BOOK': case 'ACCESSORY':
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
      case 'POTION': case 'SCROLL': case 'BOOK': case 'ACCESSORY':
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
        case 'ACCESSORY':
          displayName = $gameVariables[0].itemImageData.rings[item.id].name;
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
    // show damage type buff (now only deal with elemental damage)
    for (let id in item.damageType.elemental) {
      if (item.damageType.elemental[id] != 0) {
        switch (id) {
          case 'cold':
            result += '冰冷';
            break;
          case 'fire':
            result += '火焰';
            break;
        }
        result += '傷害';
        result += ItemUtils.showNumberWithSign(item.damageType.elemental[id] * 100) + '% ';
      }
    }
    // show elemental resistance
    for (let id in item.resistance.elemental) {
      if (item.resistance.elemental[id] != 0) {
        switch (id) {
          case 'cold':
            result += '耐寒';
            break;
          case 'fire':
            result += '耐火';
            break;
        }
        result += ItemUtils.showNumberWithSign(item.resistance.elemental[id] * 100) + '% ';
      }
    }
    // show abnormal state resistance (now only deal with positive effects)
    for (let id in item.resistance.state) {
      if (item.resistance.state[id] > 0) {
        result += '\\c[24]免疫';
        switch (id) {
          case 'blind':
            result += Message.display('stateBlind');
            break;
          case 'paralyze':
            result += Message.display('stateParalyze');
            break;
          case 'sleep':
            result += Message.display('stateSleep');
            break;
          case 'poison':
            result += Message.display('statePoison');
            break;
          case 'bleeding':
            result += Message.display('stateBleeding');
            break;
          case 'breakArmor':
            result += Message.display('stateBreakArmor');
            break;
          case 'wet':
            result += Message.display('stateWet');
            break;
          case 'acid':
            result += Message.display('stateAcid');
            break;
        }
        result += '\\c[0] ';
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
        case 'SCIMITAR':
          imageData = new ImageData('Collections1', 5, 1, 6);
          break;
        case 'SPEAR':
          imageData = new ImageData('Collections2', 0, 2, 2);
          break;
        case 'STAFF':
          imageData = new ImageData('Collections2', 3, 0, 4);
          break;
      }
    } else if (DataManager.isArmor(obj)) {
      if (prop.type == 'ACCESSORY') {
        imageData = $gameVariables[0].itemImageData.rings[obj.id];
      } else {
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
      }
    } else {
      console.log('ERROR: ItemUtils.updateItemPile: no such type!');
    }
    return imageData;
  }

  ItemUtils.updateItemPile = function(event) {
    let erased = false;
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[event._x][event._y])
      && CharUtils.playerCanSeeItemPile(event)) {
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
          toCheck.value = ItemUtils.enchantWeaponValue(toCheck.value, value);
        } else if (prop.type == 'ARMOR' && toCheck.dataId == 0) {
          ItemUtils.modifyAttr(toCheck, value);
        }
      }
    }
    ItemUtils.updateEquipDescription(equip);
  }

  ItemUtils.enchantWeaponValue = function(name, value) {
    let weaponBonus = ItemUtils.getEnchantment({name: name});
    weaponBonus += value;
    name = name.split(/\+|-/)[0];
    if (weaponBonus > 0) {
      name += '+' + weaponBonus;
    } else if (weaponBonus < 0) {
      name += weaponBonus;
    }
    return name;
  }

  ItemUtils.getItemClassFromList = function(list, dungeonLevel) {
    let probs = []; // item: {itemClass: class, prob: float}
    for (let id in list) {
      let p = CharUtils.calcMobAppearPercentage(list[id].spawnLevel, dungeonLevel);
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
        return probs[id].itemClass;
      }
    }
    return null;
  }

  ItemUtils.createItem = function(newItemClass) {
    let newItem = new newItemClass();
    if (newItem instanceof EquipTemplate) {
      // check if newItem is craftable equipment
      if (newItemClass.material) {
        let materials = [];
        for (let id in newItemClass.material) {
          let materialType = newItemClass.material[id];
          for (let i = 0; i < materialType.amount; i++) {
            let itemClass = materialType.itemClass;
            let delta = itemClass.spawnLevel - itemClass.originalSpawnLevel;
            materials.push(ItemUtils.adjustEquipByLevel(new itemClass(), delta));
          }
        }
        newItem.applyMaterials(materials);
        let prop = JSON.parse(newItem.note);
        if (prop.type == 'WEAPON') {
          // adjust weapon damage
          ItemUtils.adjustEquipByLevel(newItem, newItemClass.spawnLevel - newItemClass.originalSpawnLevel);
        }
      } else {
        ItemUtils.adjustEquipByLevel(newItem, newItemClass.spawnLevel - newItemClass.originalSpawnLevel);
      }
    }
    return newItem;
  }

  ItemUtils.spawnItem = function(mapId) {
    let list;
    let newItemClass;
    let dungeonLevel = $gameVariables[mapId].dungeonLevel;
    do {
      let mapTypeIndex = MapUtils.getMapTypeIndex($gameVariables[mapId].mapType);
      if (getRandomInt(100) / 100 > genLocalDungeonObjectPercentage) {
        // item from other dungeons
        let temp;
        do {
          temp = getRandomInt(ItemUtils.lootingTemplates.length);
        } while (temp == mapTypeIndex);
        mapTypeIndex = temp;
      }
      let itemType = getRandomInt(100);
      if (itemType < 60) {
        // spawn material
        let indicator = getRandomInt(5);
        switch (indicator) {
          case 0: // skin
            list = ItemUtils.lootingTemplates[mapTypeIndex].skin;
            break;
          case 1: // tooth
            list = ItemUtils.lootingTemplates[mapTypeIndex].tooth;
            break;
          case 2: // claw
            list = ItemUtils.lootingTemplates[mapTypeIndex].claw;
            break;
          case 3: // bone
            list = ItemUtils.lootingTemplates[mapTypeIndex].bone;
            break;
          case 4: // material
            list = ItemUtils.lootingTemplates[mapTypeIndex].material;
            break;
        }
        newItemClass = ItemUtils.getItemClassFromList(list, dungeonLevel);
      } else if (itemType < 99) {
        // spawn scroll/potion
        if (getRandomInt(2) == 0) {
          // scroll
          list = ItemUtils.scrollTemplates;
        } else {
          list = ItemUtils.potionTemplates;
        }
        newItemClass = list[getRandomInt(list.length)];
      } else {
        // spawn equipment
        let indicator = getRandomInt(6);
        switch (indicator) {
          case 0: // helmet
            list = ItemUtils.equipTemplates[mapTypeIndex].helmet;
            break;
          case 1: // gloves
            list = ItemUtils.equipTemplates[mapTypeIndex].gloves;
            break;
          case 2: // shoes
            list = ItemUtils.equipTemplates[mapTypeIndex].shoes;
            break;
          case 3: // shield
            list = ItemUtils.equipTemplates[mapTypeIndex].shield;
            break;
          case 4: // coat
            list = ItemUtils.equipTemplates[mapTypeIndex].coat;
            break;
          case 5: // weapon
            list = ItemUtils.equipTemplates[mapTypeIndex].weapon;
            break;
        }
        newItemClass = ItemUtils.getItemClassFromList(list, dungeonLevel);
      }
    } while (!newItemClass);
    let newItem = ItemUtils.createItem(newItemClass);
    return newItem;
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

  // adjust equipment attributes by level
  ItemUtils.adjustEquipByLevel = function(equip, delta) {
    if (equip instanceof EquipTemplate) { // only update equipment
      // update def & mdef
      for (let i = 0; i < 2; i++) {
        if (equip.traits[i].value != 0) {
          ItemUtils.modifyAttr(equip.traits[i], delta);
          equip.traits[i].value = (equip.traits[i].value < 0) ? 0 : equip.traits[i].value;
        }
      }
      // update weapon atk if equip is weapon
      if (equip.traits[2]) {
        ItemUtils.enchantEquip(equip, delta);
      }

      // update params
      for (let i = 2; i <= 6; i++) {
        if (equip.params[i] != 0) {
          equip.params[i] += delta;
          equip.params[i] = (equip.params[i] < 0) ? 0 : equip.params[i];
        }
      }
      ItemUtils.updateEquipDescription(equip);
    }
    return equip;
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
    this.weight = 0;
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
    let rng = getRandomInt(100);
    if (rng < 5) {
      this.bucState = -1;
    } else if (rng < 15) {
      this.bucState = 1;
    }
    // initialize resistance
    this.resistance = new ResistanceData();
    // initialize damage effect
    this.damageType = new ResistanceData();
  };

  EquipTemplate.prototype.onWear = function(realTarget) {
    for (let id in this.resistance.state) {
      realTarget.status.resistance.state[id] += this.resistance.state[id];
    }
    for (let id in this.resistance.elemental) {
      realTarget.status.resistance.elemental[id] += this.resistance.elemental[id];
    }
    for (let id in this.damageType.state) {
      realTarget.status.damageType.state[id] += this.damageType.state[id];
    }
    for (let id in this.damageType.elemental) {
      realTarget.status.damageType.elemental[id] += this.damageType.elemental[id];
    }
  }

  EquipTemplate.prototype.onRemove = function(realTarget) {
    for (let id in this.resistance.state) {
      realTarget.status.resistance.state[id] -= this.resistance.state[id];
    }
    for (let id in this.resistance.elemental) {
      realTarget.status.resistance.elemental[id] -= this.resistance.elemental[id];
    }
    for (let id in this.damageType.state) {
      realTarget.status.damageType.state[id] -= this.damageType.state[id];
    }
    for (let id in this.damageType.elemental) {
      realTarget.status.damageType.elemental[id] -= this.damageType.elemental[id];
    }
  }

  // combine materials attribute
  EquipTemplate.prototype.applyMaterials = function(materials) {
    let tempValue = {
      params: [0, 0, 0, 0, 0, 0, 0],
      traits: [0, 0]
    }
    // record effect material count
    let effectCount = {
      params: [0, 0, 0, 0, 0, 0, 0],
      traits: [0, 0]
    }
    for (let i = 0; i < materials.length; i++) {
      let toAdd = materials[i];
      // update params
      if (toAdd.params) {
        for (let j = 2; j <= 6; j++) {
          if (toAdd.params[j] != 0) {
            tempValue.params[j] += toAdd.params[j];
            effectCount.params[j]++;
          }
        }
      }

      // update attrs (weapon damage not included)
      if (toAdd.traits) {
        for (let j = 0; j < 2; j++) {
          if (toAdd.traits[j].value != 0) {
            tempValue.traits[j] += toAdd.traits[j].value;
            effectCount.traits[j]++;
          }
        }
      }
    }
    // average them & apply to this equipment
    for (let i = 2; i <= 6; i++) {
      if (effectCount.params[i] > 0) {
        tempValue.params[i] = Math.round(tempValue.params[i] / effectCount.params[i]);
        this.params[i] += tempValue.params[i];
      }
    }
    for (let i = 0; i < 2; i++) {
      if (effectCount.traits[i] > 0) {
        tempValue.traits[i] /= effectCount.traits[i];
        this.traits[i].value += tempValue.traits[i];
      }
    }
    ItemUtils.updateEquipDescription(this);
  }

  //-----------------------------------------------------------------------------------
  // Feather
  //
  // type: MATERIAL

  Feather = function() {
    this.initialize.apply(this, arguments);
  }

  Feather.prototype = Object.create(ItemTemplate.prototype);
  Feather.prototype.constructor = Feather;

  Feather.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[12]);
    this.weight = 1;
  }
  ItemUtils.lootingTemplates[0].material.push(Feather);

  //-----------------------------------------------------------------------------------
  // Rat_Tail
  //
  // type: MATERIAL

  Rat_Tail = function() {
    this.initialize.apply(this, arguments);
  }

  Rat_Tail.prototype = Object.create(ItemTemplate.prototype);
  Rat_Tail.prototype.constructor = Rat_Tail;

  Rat_Tail.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[15]);
    this.name = '鼠尾巴';
    this.description = '細長的尾巴, 可以用來做什麼呢?';
    this.weight = 2;
  }
  ItemUtils.lootingTemplates[0].material.push(Rat_Tail);

  //-----------------------------------------------------------------------------------
  // Buffalo_Horn
  //
  // type: MATERIAL

  Buffalo_Horn = function() {
    this.initialize.apply(this, arguments);
  }

  Buffalo_Horn.prototype = Object.create(ItemTemplate.prototype);
  Buffalo_Horn.prototype.constructor = Buffalo_Horn;

  Buffalo_Horn.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[16]);
    this.name = '牛角';
    this.description = '堅硬的牛角(麵包?)';
    this.weight = 5;
  }
  ItemUtils.lootingTemplates[0].material.push(Buffalo_Horn);

  //-----------------------------------------------------------------------------------
  // Earth_Crystal
  //
  // type: MATERIAL

  Earth_Crystal = function() {
    this.initialize.apply(this, arguments);
  }

  Earth_Crystal.prototype = Object.create(ItemTemplate.prototype);
  Earth_Crystal.prototype.constructor = Earth_Crystal;

  Earth_Crystal.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[18]);
    this.name = '大地結晶';
    this.description = '深邃且堅硬的結晶';
    this.weight = 5;
  }
  ItemUtils.lootingTemplates[0].material.push(Earth_Crystal);

  //-----------------------------------------------------------------------------------
  // Mucus
  //
  // type: MATERIAL

  Mucus = function() {
    this.initialize.apply(this, arguments);
  }

  Mucus.prototype = Object.create(ItemTemplate.prototype);
  Mucus.prototype.constructor = Mucus;

  Mucus.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[17]);
    this.name = '黏液';
    this.description = '具有包覆作用';
    this.weight = 10;
  }
  ItemUtils.lootingTemplates[1].material.push(Mucus);

  //-----------------------------------------------------------------------------------
  // Blue_Crystal
  //
  // type: MATERIAL

  Blue_Crystal = function() {
    this.initialize.apply(this, arguments);
  }

  Blue_Crystal.prototype = Object.create(ItemTemplate.prototype);
  Blue_Crystal.prototype.constructor = Blue_Crystal;

  Blue_Crystal.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[18]);
    this.name = '藍色結晶';
    this.description = '史萊姆體內產生的堅硬物質';
    this.weight = 5;
  }
  ItemUtils.lootingTemplates[1].material.push(Blue_Crystal);

  //-----------------------------------------------------------------------------------
  // Glue
  //
  // type: MATERIAL

  Glue = function() {
    this.initialize.apply(this, arguments);
  }

  Glue.prototype = Object.create(ItemTemplate.prototype);
  Glue.prototype.constructor = Glue;

  Glue.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[17]);
    this.name = '膠質';
    this.description = '具有絕緣作用';
    this.weight = 10;
  }
  ItemUtils.lootingTemplates[1].material.push(Glue);

  //-----------------------------------------------------------------------------------
  // Tentacle
  //
  // type: MATERIAL

  Tentacle = function() {
    this.initialize.apply(this, arguments);
  }

  Tentacle.prototype = Object.create(ItemTemplate.prototype);
  Tentacle.prototype.constructor = Tentacle;

  Tentacle.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[19]);
    this.name = '觸手';
    this.description = '帶電的觸手';
    this.weight = 5;
  }
  ItemUtils.lootingTemplates[1].material.push(Tentacle);

  //-----------------------------------------------------------------------------------
  // FireHorse_Shoe
  //
  // type: MATERIAL

  FireHorse_Shoe = function() {
    this.initialize.apply(this, arguments);
  }

  FireHorse_Shoe.prototype = Object.create(ItemTemplate.prototype);
  FireHorse_Shoe.prototype.constructor = FireHorse_Shoe;

  FireHorse_Shoe.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[16]);
    this.name = '馬蹄';
    this.description = '被踢到會凹下去';
    this.weight = 5;
  }
  ItemUtils.lootingTemplates[2].material.push(FireHorse_Shoe);

  //-----------------------------------------------------------------------------------
  // FireHorse_Tail
  //
  // type: MATERIAL

  FireHorse_Tail = function() {
    this.initialize.apply(this, arguments);
  }

  FireHorse_Tail.prototype = Object.create(ItemTemplate.prototype);
  FireHorse_Tail.prototype.constructor = FireHorse_Tail;

  FireHorse_Tail.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[15]);
    this.name = '燃燒的鬃毛';
    this.description = '永遠燃燒著火焰, 但卻不會燙傷你';
    this.weight = 2;
  }
  ItemUtils.lootingTemplates[2].material.push(FireHorse_Tail);

  //-----------------------------------------------------------------------------------
  // Phoenix_Feather
  //
  // type: MATERIAL

  Phoenix_Feather = function() {
    this.initialize.apply(this, arguments);
  }

  Phoenix_Feather.prototype = Object.create(ItemTemplate.prototype);
  Phoenix_Feather.prototype.constructor = Phoenix_Feather;

  Phoenix_Feather.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[12]);
    this.name = '鳳凰羽毛';
    this.description = '溫熱發亮的羽毛';
    this.weight = 1;
  }
  ItemUtils.lootingTemplates[2].material.push(Phoenix_Feather);

  //-----------------------------------------------------------------------------------
  // Phoenix_Blood
  //
  // type: MATERIAL

  Phoenix_Blood = function() {
    this.initialize.apply(this, arguments);
  }

  Phoenix_Blood.prototype = Object.create(ItemTemplate.prototype);
  Phoenix_Blood.prototype.constructor = Phoenix_Blood;

  Phoenix_Blood.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[17]);
    this.name = '不死鳥之血';
    this.description = '不斷沸騰著的血';
    this.weight = 10;
  }
  ItemUtils.lootingTemplates[2].material.push(Phoenix_Blood);

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
    this.weight = 50;
  }

  //-----------------------------------------------------------------------------------
  // Honey
  //
  // type: FOOD

  Honey = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
  }
  ItemUtils.lootingTemplates[0].material.push(Honey);

  //-----------------------------------------------------------------------------------
  // Cheese
  //
  // type: FOOD

  Cheese = function() {
    this.initialize.apply(this, arguments);
  }

  Cheese.prototype = Object.create(ItemTemplate.prototype);
  Cheese.prototype.constructor = Cheese;

  Cheese.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[20]);
    this.name = '起司'
    this.description = '誰偷走了我的起司?';
    this.templateName = this.name;
    this.nutrition = 300;
    this.status = 'PERMANENT'; // never rots
    this.producedTime = $gameVariables[0].gameTime;
    this.weight = 10;
  }
  ItemUtils.lootingTemplates[0].material.push(Cheese);

  //-----------------------------------------------------------------------------------
  // Bee_Sting
  //
  // weapon type: TOOTH

  Bee_Sting = function() {
    this.initialize.apply(this, arguments);
  }

  Bee_Sting.prototype = Object.create(EquipTemplate.prototype);
  Bee_Sting.prototype.constructor = Bee_Sting;

  Bee_Sting.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '蜂刺';
    this.description = '細長的蜜蜂尾刺';
    this.templateName = this.name;
    this.weight = 2;
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
  ItemUtils.lootingTemplates[0].tooth.push(Bee_Sting);

  //-----------------------------------------------------------------------------------
  // Dog_Tooth
  //
  // weapon type: TOOTH

  Dog_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Dog_Tooth.prototype.constructor = Dog_Tooth;

  Dog_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '犬牙';
    this.description = '剛長出來不久的牙齒';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].tooth.push(Dog_Tooth);

  //-----------------------------------------------------------------------------------
  // Rooster_Tooth
  //
  // weapon type: TOOTH

  Rooster_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Rooster_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Rooster_Tooth.prototype.constructor = Rooster_Tooth;

  Rooster_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '雞喙';
    this.description = '被啄到會很痛';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].tooth.push(Rooster_Tooth);

  //-----------------------------------------------------------------------------------
  // Cat_Tooth
  //
  // weapon type: TOOTH

  Cat_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Cat_Tooth.prototype.constructor = Cat_Tooth;

  Cat_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '貓牙';
    this.description = '尖銳的牙齒';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].tooth.push(Cat_Tooth);

  //-----------------------------------------------------------------------------------
  // Boar_Tooth
  //
  // weapon type: TOOTH

  Boar_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Boar_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Boar_Tooth.prototype.constructor = Boar_Tooth;

  Boar_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '野豬牙';
    this.description = '彎曲的牙齒';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].tooth.push(Boar_Tooth);

  //-----------------------------------------------------------------------------------
  // Wolf_Tooth
  //
  // weapon type: TOOTH

  Wolf_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Tooth.prototype.constructor = Wolf_Tooth;

  Wolf_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '狼牙';
    this.description = '堅韌的牙齒';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].tooth.push(Wolf_Tooth);

  //-----------------------------------------------------------------------------------
  // Lion_Tooth
  //
  // weapon type: TOOTH

  Lion_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Lion_Tooth.prototype.constructor = Lion_Tooth;

  Lion_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '獅牙';
    this.description = '野獸之王的牙齒';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d7';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].tooth.push(Lion_Tooth);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Tooth
  //
  // weapon type: TOOTH

  EarthDragon_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Tooth.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Tooth.prototype.constructor = EarthDragon_Tooth;

  EarthDragon_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '龍牙(岩)';
    this.description = '神秘且充滿力量的牙齒';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 5);
    modifier += this.bucState;
    this.traits[2].value = '1d9';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].tooth.push(EarthDragon_Tooth);

  //-----------------------------------------------------------------------------------
  // Shark_Tooth
  //
  // weapon type: TOOTH

  Shark_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Shark_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Shark_Tooth.prototype.constructor = Shark_Tooth;

  Shark_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '鯊魚牙';
    this.description = '尖銳且鋒利的牙齒';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d8';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[1].tooth.push(Shark_Tooth);

  //-----------------------------------------------------------------------------------
  // IceDragon_Tooth
  //
  // weapon type: TOOTH

  IceDragon_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Tooth.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Tooth.prototype.constructor = IceDragon_Tooth;

  IceDragon_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '龍牙(冰)';
    this.description = '神秘且充滿力量的牙齒';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d9';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[1].tooth.push(IceDragon_Tooth);

  //-----------------------------------------------------------------------------------
  // Salamander_Tooth
  //
  // weapon type: TOOTH

  Salamander_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Tooth.prototype.constructor = Salamander_Tooth;

  Salamander_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '火蜥蜴牙';
    this.description = '發燙的尖牙';
    this.templateName = this.name;
    this.weight = 3;
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
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].tooth.push(Salamander_Tooth);

  //-----------------------------------------------------------------------------------
  // Phoenix_Tooth
  //
  // weapon type: TOOTH

  Phoenix_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  Phoenix_Tooth.prototype = Object.create(EquipTemplate.prototype);
  Phoenix_Tooth.prototype.constructor = Phoenix_Tooth;

  Phoenix_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '鳳凰喙';
    this.description = '溫熱發亮的喙';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d8';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].tooth.push(Phoenix_Tooth);

  //-----------------------------------------------------------------------------------
  // FireDragon_Tooth
  //
  // weapon type: TOOTH

  FireDragon_Tooth = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Tooth.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Tooth.prototype.constructor = FireDragon_Tooth;

  FireDragon_Tooth.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[11]);
    this.name = '龍牙(火)';
    this.description = '神秘且充滿力量的牙齒';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '1d9';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].tooth.push(FireDragon_Tooth);

  //-----------------------------------------------------------------------------------
  // Dog_Bone
  //
  // weapon type: BONE

  Dog_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Bone.prototype = Object.create(EquipTemplate.prototype);
  Dog_Bone.prototype.constructor = Dog_Bone;

  Dog_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '犬骨';
    this.description = '棒狀的骨頭';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1';
    this.params[4] = 1;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Dog_Bone);

  //-----------------------------------------------------------------------------------
  // Cat_Bone
  //
  // weapon type: BONE

  Cat_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Bone.prototype = Object.create(EquipTemplate.prototype);
  Cat_Bone.prototype.constructor = Cat_Bone;

  Cat_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '貓骨';
    this.description = '輕巧的骨頭';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d2';
    this.params[4] = 3;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Cat_Bone);

  //-----------------------------------------------------------------------------------
  // Wolf_Bone
  //
  // weapon type: BONE

  Wolf_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Bone.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Bone.prototype.constructor = Wolf_Bone;

  Wolf_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '狼骨';
    this.description = '又輕又堅韌的骨頭';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d2';
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Wolf_Bone);

  //-----------------------------------------------------------------------------------
  // Bear_Bone
  //
  // weapon type: BONE

  Bear_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Bone.prototype = Object.create(EquipTemplate.prototype);
  Bear_Bone.prototype.constructor = Bear_Bone;

  Bear_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '熊骨';
    this.description = '厚實堅韌的骨頭';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d3';
    this.params[4] = 5;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Bear_Bone);

  //-----------------------------------------------------------------------------------
  // Buffalo_Bone
  //
  // weapon type: BONE

  Buffalo_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Buffalo_Bone.prototype = Object.create(EquipTemplate.prototype);
  Buffalo_Bone.prototype.constructor = Buffalo_Bone;

  Buffalo_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '牛骨';
    this.description = '通常用來熬高湯?';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d3';
    this.params[4] = 6;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Buffalo_Bone);

  //-----------------------------------------------------------------------------------
  // Lion_Bone
  //
  // weapon type: BONE

  Lion_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Bone.prototype = Object.create(EquipTemplate.prototype);
  Lion_Bone.prototype.constructor = Lion_Bone;

  Lion_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '獅骨';
    this.description = '百獸之王的骨頭';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4';
    this.params[4] = 7;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(Lion_Bone);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Bone
  //
  // weapon type: BONE

  EarthDragon_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Bone.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Bone.prototype.constructor = EarthDragon_Bone;

  EarthDragon_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '龍骨(岩)';
    this.description = '充滿古老的魔法力量';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4+2';
    this.params[4] = 8;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].bone.push(EarthDragon_Bone);

  //-----------------------------------------------------------------------------------
  // IceDragon_Bone
  //
  // weapon type: BONE

  IceDragon_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Bone.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Bone.prototype.constructor = IceDragon_Bone;

  IceDragon_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '龍骨(冰)';
    this.description = '充滿古老的魔法力量';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4';
    this.params[4] = 8;
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[1].bone.push(IceDragon_Bone);

  //-----------------------------------------------------------------------------------
  // Salamander_Bone
  //
  // weapon type: BONE

  Salamander_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Bone.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Bone.prototype.constructor = Salamander_Bone;

  Salamander_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '火蜥蜴骨';
    this.description = '發燙的骨頭';
    this.templateName = this.name;
    this.weight = 3;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d2';
    this.params[4] = 3;
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].bone.push(Salamander_Bone);

  //-----------------------------------------------------------------------------------
  // FireDragon_Bone
  //
  // weapon type: BONE

  FireDragon_Bone = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Bone.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Bone.prototype.constructor = FireDragon_Bone;

  FireDragon_Bone.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[12]);
    this.name = '龍骨(火)';
    this.description = '充滿古老的魔法力量';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4';
    this.params[4] = 8;
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].bone.push(FireDragon_Bone);

  //-----------------------------------------------------------------------------------
  // Rooster_Claw
  //
  // weapon type: CLAW

  Rooster_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Rooster_Claw.prototype = Object.create(EquipTemplate.prototype);
  Rooster_Claw.prototype.constructor = Rooster_Claw;

  Rooster_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '雞爪';
    this.description = '調理後會很好吃?';
    this.templateName = this.name;
    this.weight = 3;
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
  ItemUtils.lootingTemplates[0].claw.push(Rooster_Claw);

  //-----------------------------------------------------------------------------------
  // Cat_Claw
  //
  // weapon type: CLAW

  Cat_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Claw.prototype = Object.create(EquipTemplate.prototype);
  Cat_Claw.prototype.constructor = Cat_Claw;

  Cat_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '貓爪';
    this.description = '可以輕易撕開皮膚';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '2d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].claw.push(Cat_Claw);

  //-----------------------------------------------------------------------------------
  // Wolf_Claw
  //
  // weapon type: CLAW

  Wolf_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Claw.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Claw.prototype.constructor = Wolf_Claw;

  Wolf_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '狼爪';
    this.description = '粗長又銳利的爪';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].claw.push(Wolf_Claw);

  //-----------------------------------------------------------------------------------
  // Bear_Claw
  //
  // weapon type: CLAW

  Bear_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Claw.prototype = Object.create(EquipTemplate.prototype);
  Bear_Claw.prototype.constructor = Bear_Claw;

  Bear_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '熊爪';
    this.description = '厚實堅韌的爪';
    this.templateName = this.name;
    this.weight = 4;
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
  ItemUtils.lootingTemplates[0].claw.push(Bear_Claw);

  //-----------------------------------------------------------------------------------
  // Lion_Claw
  //
  // weapon type: CLAW

  Lion_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Claw.prototype = Object.create(EquipTemplate.prototype);
  Lion_Claw.prototype.constructor = Lion_Claw;

  Lion_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '獅爪';
    this.description = '萬獸之王的爪';
    this.templateName = this.name;
    this.weight = 4;
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
  ItemUtils.lootingTemplates[0].claw.push(Lion_Claw);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Claw
  //
  // weapon type: CLAW

  EarthDragon_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Claw.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Claw.prototype.constructor = EarthDragon_Claw;

  EarthDragon_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '龍爪(岩)';
    this.description = '古老又神秘的爪';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(3, 6);
    modifier += this.bucState;
    this.traits[2].value = '2d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[0].claw.push(EarthDragon_Claw);

  //-----------------------------------------------------------------------------------
  // IceDragon_Claw
  //
  // weapon type: CLAW

  IceDragon_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Claw.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Claw.prototype.constructor = IceDragon_Claw;

  IceDragon_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '龍爪(冰)';
    this.description = '古老又神秘的爪';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '2d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[1].claw.push(IceDragon_Claw);

  //-----------------------------------------------------------------------------------
  // Salamander_Claw
  //
  // weapon type: CLAW

  Salamander_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Claw.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Claw.prototype.constructor = Salamander_Claw;

  Salamander_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '火蜥蜴爪';
    this.description = '發燙的爪';
    this.templateName = this.name;
    this.weight = 4;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].claw.push(Salamander_Claw);

  //-----------------------------------------------------------------------------------
  // FireDragon_Claw
  //
  // weapon type: CLAW

  FireDragon_Claw = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Claw.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Claw.prototype.constructor = FireDragon_Claw;

  FireDragon_Claw.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[13]);
    this.name = '龍爪(火)';
    this.description = '古老又神秘的爪';
    this.templateName = this.name;
    this.weight = 5;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '2d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  }
  ItemUtils.lootingTemplates[2].claw.push(FireDragon_Claw);

  //-----------------------------------------------------------------------------------
  // Dog_Skin
  //
  // armor type: SKIN

  Dog_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Skin.prototype = Object.create(EquipTemplate.prototype);
  Dog_Skin.prototype.constructor = Dog_Skin;

  Dog_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '犬皮';
    this.description = '髒兮兮的薄皮';
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Dog_Skin);

  //-----------------------------------------------------------------------------------
  // Cat_Skin
  //
  // armor type: SKIN

  Cat_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Skin.prototype = Object.create(EquipTemplate.prototype);
  Cat_Skin.prototype.constructor = Cat_Skin;

  Cat_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '貓皮';
    this.description = '泛著光澤的皮';
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Cat_Skin);

  //-----------------------------------------------------------------------------------
  // Wolf_Skin
  //
  // armor type: SKIN

  Wolf_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Skin.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Skin.prototype.constructor = Wolf_Skin;

  Wolf_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '狼皮';
    this.description = '堅韌的毛皮';
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 6 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Wolf_Skin);

  //-----------------------------------------------------------------------------------
  // Bear_Skin
  //
  // armor type: SKIN

  Bear_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Skin.prototype = Object.create(EquipTemplate.prototype);
  Bear_Skin.prototype.constructor = Bear_Skin;

  Bear_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '熊皮';
    this.description = '厚實的毛皮';
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Bear_Skin);

  //-----------------------------------------------------------------------------------
  // Lion_Skin
  //
  // armor type: SKIN

  Lion_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Skin.prototype = Object.create(EquipTemplate.prototype);
  Lion_Skin.prototype.constructor = Lion_Skin;

  Lion_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '獅皮';
    this.description = '百獸之王的毛皮';
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 6);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Lion_Skin);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Skin
  //
  // armor type: SKIN

  EarthDragon_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Skin.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Skin.prototype.constructor = EarthDragon_Skin;

  EarthDragon_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '龍皮(岩)';
    this.description = '古老又神秘的毛皮';
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 14 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 4);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(EarthDragon_Skin);

  //-----------------------------------------------------------------------------------
  // IceDragon_Skin
  //
  // armor type: SKIN

  IceDragon_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Skin.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Skin.prototype.constructor = IceDragon_Skin;

  IceDragon_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '龍皮(冰)';
    this.description = '古老又神秘的毛皮';
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8);
    this.resistance.elemental.cold = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[1].skin.push(IceDragon_Skin);

  //-----------------------------------------------------------------------------------
  // Salamander_Skin
  //
  // armor type: SKIN

  Salamander_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Skin.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Skin.prototype.constructor = Salamander_Skin;

  Salamander_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '火蜥蜴皮';
    this.description = '發燙的皮';
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[2].skin.push(Salamander_Skin);

  //-----------------------------------------------------------------------------------
  // FireDragon_Skin
  //
  // armor type: SKIN

  FireDragon_Skin = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Skin.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Skin.prototype.constructor = FireDragon_Skin;

  FireDragon_Skin.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[11]);
    this.name = '龍皮(火)';
    this.description = '古老又神秘的毛皮';
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[2].skin.push(FireDragon_Skin);

  //-----------------------------------------------------------------------------------
  // Turtle_Shell
  //
  // armor type: SHIELD

  Turtle_Shell = function() {
    this.initialize.apply(this, arguments);
  }

  Turtle_Shell.prototype = Object.create(EquipTemplate.prototype);
  Turtle_Shell.prototype.constructor = Turtle_Shell;

  Turtle_Shell.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[17]);
    this.name = '龜殼';
    this.description = '堅硬的殼';
    this.templateName = this.name;
    this.weight = 20;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 4);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.lootingTemplates[0].skin.push(Turtle_Shell);

  //-----------------------------------------------------------------------------------
  // Dart_Lv1_T1
  //
  // type: DART

  Dart_Lv1_T1 = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Lv1_T1);
  ItemUtils.lootingTemplates[0].material.push(Dart_Lv1_T1);

  //-----------------------------------------------------------------------------------
  // Dart_Lv1_T2
  //
  // type: DART

  Dart_Lv1_T2 = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Lv1_T2);
  ItemUtils.lootingTemplates[0].material.push(Dart_Lv1_T2);

  //-----------------------------------------------------------------------------------
  // Dart_Lv1_T3
  //
  // type: DART

  Dart_Lv1_T3 = function() {
    this.initialize.apply(this, arguments);
  }

  Dart_Lv1_T3.itemName = '飛鏢Lv1';
  Dart_Lv1_T3.itemDescription = '射向敵人造成傷害';
  Dart_Lv1_T3.material = [{itemClass: Feather, amount: 1}, {itemClass: Bee_Sting, amount: 1}];

  Dart_Lv1_T3.prototype = Object.create(ItemTemplate.prototype);
  Dart_Lv1_T3.prototype.constructor = Dart_Lv1_T3;

  Dart_Lv1_T3.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d8';
    this.name = Dart_Lv1_T3.itemName;
    this.description = Dart_Lv1_T3.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Lv1_T3);
  ItemUtils.lootingTemplates[0].material.push(Dart_Lv1_T3);

  //-----------------------------------------------------------------------------------
  // Dart_Lv2_T1
  //
  // type: DART

  Dart_Lv2_T1 = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Lv2_T1);
  ItemUtils.lootingTemplates[0].material.push(Dart_Lv2_T1);

  //-----------------------------------------------------------------------------------
  // Dart_Lv2_T2
  //
  // type: DART

  Dart_Lv2_T2 = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Lv2_T2);
  ItemUtils.lootingTemplates[0].material.push(Dart_Lv2_T2);

  //-----------------------------------------------------------------------------------
  // Dart_Fire_T1
  //
  // type: DART

  Dart_Fire_T1 = function() {
    this.initialize.apply(this, arguments);
  }

  Dart_Fire_T1.itemName = '火焰飛鏢';
  Dart_Fire_T1.itemDescription = '射向敵人造成傷害';
  Dart_Fire_T1.material = [{itemClass: Phoenix_Feather, amount: 1}, {itemClass: Salamander_Tooth, amount: 1}];

  Dart_Fire_T1.prototype = Object.create(ItemTemplate.prototype);
  Dart_Fire_T1.prototype.constructor = Dart_Fire_T1;

  Dart_Fire_T1.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d16';
    this.name = Dart_Fire_T1.itemName;
    this.description = Dart_Fire_T1.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Fire_T1);

  //-----------------------------------------------------------------------------------
  // Dart_Fire_T2
  //
  // type: DART

  Dart_Fire_T2 = function() {
    this.initialize.apply(this, arguments);
  }

  Dart_Fire_T2.itemName = '火焰飛鏢';
  Dart_Fire_T2.itemDescription = '射向敵人造成傷害';
  Dart_Fire_T2.material = [{itemClass: Phoenix_Feather, amount: 1}, {itemClass: Phoenix_Tooth, amount: 1}];

  Dart_Fire_T2.prototype = Object.create(ItemTemplate.prototype);
  Dart_Fire_T2.prototype.constructor = Dart_Fire_T2;

  Dart_Fire_T2.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[13]);
    this.damage = '1d16';
    this.name = Dart_Fire_T2.itemName;
    this.description = Dart_Fire_T2.itemDescription + '\n投擲傷害' + this.damage;
    this.templateName = this.name;
    this.weight = 3;
  }
  ItemUtils.recipes.push(Dart_Fire_T2);

  //-----------------------------------------------------------------------------------
  // Dog_Gloves
  //
  // armor type: GLOVES

  Dog_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(Dog_Gloves);

  //-----------------------------------------------------------------------------------
  // Dog_Shoes
  //
  // armor type: SHOES

  Dog_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(Dog_Shoes);

  //-----------------------------------------------------------------------------------
  // Dog_Shield
  //
  // armor type: SHIELD

  Dog_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Shield.itemName = '狗皮盾';
  Dog_Shield.itemDescription = '簡單的輕盾';
  Dog_Shield.material = [{itemClass: Dog_Skin, amount: 3}, {itemClass: Dog_Bone, amount: 3}];

  Dog_Shield.prototype = Object.create(EquipTemplate.prototype);
  Dog_Shield.prototype.constructor = Dog_Shield;

  Dog_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Dog_Shield.itemName;
    this.description = Dog_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 30;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Shield);
  ItemUtils.equipTemplates[0].shield.push(Dog_Shield);

  //-----------------------------------------------------------------------------------
  // Dog_Helmet
  //
  // armor type: HELMET

  Dog_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(Dog_Helmet);

  //-----------------------------------------------------------------------------------
  // Dog_Coat
  //
  // armor type: COAT

  Dog_Coat = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 80;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Coat);
  ItemUtils.equipTemplates[0].coat.push(Dog_Coat);

  //-----------------------------------------------------------------------------------
  // Cat_Gloves
  //
  // armor type: GLOVES

  Cat_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(Cat_Gloves);

  //-----------------------------------------------------------------------------------
  // Cat_Shoes
  //
  // armor type: SHOES

  Cat_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(Cat_Shoes);

  //-----------------------------------------------------------------------------------
  // Cat_Helmet
  //
  // armor type: HELMET

  Cat_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(Cat_Helmet);

  //-----------------------------------------------------------------------------------
  // Cat_Coat
  //
  // armor type: COAT

  Cat_Coat = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 80;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Coat);
  ItemUtils.equipTemplates[0].coat.push(Cat_Coat);

  //-----------------------------------------------------------------------------------
  // Cat_Shield
  //
  // armor type: SHIELD

  Cat_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Shield.itemName = '貓皮盾';
  Cat_Shield.itemDescription = '泛著光澤的輕盾';
  Cat_Shield.material = [{itemClass: Cat_Skin, amount: 3}, {itemClass: Cat_Bone, amount: 3}];

  Cat_Shield.prototype = Object.create(EquipTemplate.prototype);
  Cat_Shield.prototype.constructor = Cat_Shield;

  Cat_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Cat_Shield.itemName;
    this.description = Cat_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 30;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Shield);
  ItemUtils.equipTemplates[0].shield.push(Cat_Shield);

  //-----------------------------------------------------------------------------------
  // Wolf_Gloves
  //
  // armor type: GLOVES

  Wolf_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(Wolf_Gloves);

  //-----------------------------------------------------------------------------------
  // Wolf_Shoes
  //
  // armor type: SHOES

  Wolf_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(Wolf_Shoes);

  //-----------------------------------------------------------------------------------
  // Wolf_Shield
  //
  // armor type: SHIELD

  Wolf_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Shield.itemName = '狼皮盾';
  Wolf_Shield.itemDescription = '堅韌的輕盾';
  Wolf_Shield.material = [{itemClass: Wolf_Skin, amount: 3}, {itemClass: Wolf_Bone, amount: 3}];

  Wolf_Shield.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Shield.prototype.constructor = Wolf_Shield;

  Wolf_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Wolf_Shield.itemName;
    this.description = Wolf_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 40;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Shield);
  ItemUtils.equipTemplates[0].shield.push(Wolf_Shield);

  //-----------------------------------------------------------------------------------
  // Wolf_Helmet
  //
  // armor type: HELMET

  Wolf_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(Wolf_Helmet);

  //-----------------------------------------------------------------------------------
  // Wolf_Coat
  //
  // armor type: COAT

  Wolf_Coat = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 80;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 6 + this.bucState);
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Coat);
  ItemUtils.equipTemplates[0].coat.push(Wolf_Coat);

  //-----------------------------------------------------------------------------------
  // Bear_Gloves
  //
  // armor type: GLOVES

  Bear_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(Bear_Gloves);

  //-----------------------------------------------------------------------------------
  // Bear_Shoes
  //
  // armor type: SHOES

  Bear_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Shoes.itemName = '熊皮靴';
  Bear_Shoes.itemDescription = '厚實的靴子';
  Bear_Shoes.material = [{itemClass: Bear_Skin, amount: 4}];

  Bear_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Bear_Shoes.prototype.constructor = Bear_Shoes;

  Bear_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Bear_Shoes.itemName;
    this.description = Bear_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(Bear_Shoes);

  //-----------------------------------------------------------------------------------
  // Bear_Shield
  //
  // armor type: SHIELD

  Bear_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Shield.itemName = '熊皮盾';
  Bear_Shield.itemDescription = '厚實的盾';
  Bear_Shield.material = [{itemClass: Bear_Skin, amount: 3}, {itemClass: Bear_Bone, amount: 3}];

  Bear_Shield.prototype = Object.create(EquipTemplate.prototype);
  Bear_Shield.prototype.constructor = Bear_Shield;

  Bear_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Bear_Shield.itemName;
    this.description = Bear_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 40;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Shield);
  ItemUtils.equipTemplates[0].shield.push(Bear_Shield);

  //-----------------------------------------------------------------------------------
  // Bear_Helmet
  //
  // armor type: HELMET

  Bear_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(Bear_Helmet);

  //-----------------------------------------------------------------------------------
  // Bear_Coat
  //
  // armor type: COAT

  Bear_Coat = function() {
    this.initialize.apply(this, arguments);
  }

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
    this.weight = 100;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Coat);
  ItemUtils.equipTemplates[0].coat.push(Bear_Coat);

  //-----------------------------------------------------------------------------------
  // Lion_Gloves
  //
  // armor type: GLOVES

  Lion_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Gloves.itemName = '獅皮手套';
  Lion_Gloves.itemDescription = '大貓皮手套';
  Lion_Gloves.material = [{itemClass: Lion_Skin, amount: 4}];

  Lion_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Lion_Gloves.prototype.constructor = Lion_Gloves;

  Lion_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Lion_Gloves.itemName;
    this.description = Lion_Gloves.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(Lion_Gloves);

  //-----------------------------------------------------------------------------------
  // Lion_Shoes
  //
  // armor type: SHOES

  Lion_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Shoes.itemName = '獅皮靴';
  Lion_Shoes.itemDescription = '大貓皮靴子';
  Lion_Shoes.material = [{itemClass: Lion_Skin, amount: 4}];

  Lion_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Lion_Shoes.prototype.constructor = Lion_Shoes;

  Lion_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Lion_Shoes.itemName;
    this.description = Lion_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(Lion_Shoes);

  //-----------------------------------------------------------------------------------
  // Lion_Shield
  //
  // armor type: SHIELD

  Lion_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Shield.itemName = '獅皮盾';
  Lion_Shield.itemDescription = '大貓皮盾';
  Lion_Shield.material = [{itemClass: Lion_Skin, amount: 3}, {itemClass: Lion_Bone, amount: 3}];

  Lion_Shield.prototype = Object.create(EquipTemplate.prototype);
  Lion_Shield.prototype.constructor = Lion_Shield;

  Lion_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Lion_Shield.itemName;
    this.description = Lion_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 50;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Shield);
  ItemUtils.equipTemplates[0].shield.push(Lion_Shield);

  //-----------------------------------------------------------------------------------
  // Lion_Helmet
  //
  // armor type: HELMET

  Lion_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Helmet.itemName = '獅皮帽';
  Lion_Helmet.itemDescription = '大貓皮帽';
  Lion_Helmet.material = [{itemClass: Lion_Skin, amount: 4}];

  Lion_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Lion_Helmet.prototype.constructor = Lion_Helmet;

  Lion_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Lion_Helmet.itemName;
    this.description = Lion_Helmet.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(Lion_Helmet);

  //-----------------------------------------------------------------------------------
  // Lion_Coat
  //
  // armor type: COAT

  Lion_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Coat.itemName = '獅皮大衣';
  Lion_Coat.itemDescription = '大貓皮大衣';
  Lion_Coat.material = [{itemClass: Lion_Skin, amount: 8}];

  Lion_Coat.prototype = Object.create(EquipTemplate.prototype);
  Lion_Coat.prototype.constructor = Lion_Coat;

  Lion_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Lion_Coat.itemName;
    this.description = Lion_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 100;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 4 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 6 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Coat);
  ItemUtils.equipTemplates[0].coat.push(Lion_Coat);

  //-----------------------------------------------------------------------------------
  // Earth_Coat
  //
  // armor type: COAT

  Earth_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  Earth_Coat.itemName = '大地之衣';
  Earth_Coat.itemDescription = '厚實的衣裝, 彷彿能聞到土地的氣味';

  Earth_Coat.prototype = Object.create(EquipTemplate.prototype);
  Earth_Coat.prototype.constructor = Earth_Coat;

  Earth_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Earth_Coat.itemName;
    this.description = Earth_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 40;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 10 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.equipTemplates[0].coat.push(Earth_Coat);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Gloves
  //
  // armor type: GLOVES

  EarthDragon_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Gloves.itemName = '龍皮手套(岩)';
  EarthDragon_Gloves.itemDescription = '蘊含神秘力量的手套';
  EarthDragon_Gloves.material = [{itemClass: EarthDragon_Skin, amount: 4}];

  EarthDragon_Gloves.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Gloves.prototype.constructor = EarthDragon_Gloves;

  EarthDragon_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = EarthDragon_Gloves.itemName;
    this.description = EarthDragon_Gloves.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Gloves);
  ItemUtils.equipTemplates[0].gloves.push(EarthDragon_Gloves);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Shoes
  //
  // armor type: SHOES

  EarthDragon_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Shoes.itemName = '龍皮靴(岩)';
  EarthDragon_Shoes.itemDescription = '蘊含神秘力量的靴子';
  EarthDragon_Shoes.material = [{itemClass: EarthDragon_Skin, amount: 4}];

  EarthDragon_Shoes.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Shoes.prototype.constructor = EarthDragon_Shoes;

  EarthDragon_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = EarthDragon_Shoes.itemName;
    this.description = EarthDragon_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Shoes);
  ItemUtils.equipTemplates[0].shoes.push(EarthDragon_Shoes);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Shield
  //
  // armor type: SHIELD

  EarthDragon_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Shield.itemName = '龍皮盾(岩)';
  EarthDragon_Shield.itemDescription = '蘊含神秘力量的皮盾';
  EarthDragon_Shield.material = [{itemClass: EarthDragon_Skin, amount: 3}, {itemClass: EarthDragon_Bone, amount: 3}];

  EarthDragon_Shield.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Shield.prototype.constructor = EarthDragon_Shield;

  EarthDragon_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = EarthDragon_Shield.itemName;
    this.description = EarthDragon_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 50;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Shield);
  ItemUtils.equipTemplates[0].shield.push(EarthDragon_Shield);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Helmet
  //
  // armor type: HELMET

  EarthDragon_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Helmet.itemName = '龍皮帽(岩)';
  EarthDragon_Helmet.itemDescription = '蘊含神秘力量的皮帽';
  EarthDragon_Helmet.material = [{itemClass: EarthDragon_Skin, amount: 4}];

  EarthDragon_Helmet.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Helmet.prototype.constructor = EarthDragon_Helmet;

  EarthDragon_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = EarthDragon_Helmet.itemName;
    this.description = EarthDragon_Helmet.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Helmet);
  ItemUtils.equipTemplates[0].helmet.push(EarthDragon_Helmet);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Coat
  //
  // armor type: COAT

  EarthDragon_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Coat.itemName = '龍皮大衣(岩)';
  EarthDragon_Coat.itemDescription = '蘊含神秘力量的大衣';
  EarthDragon_Coat.material = [{itemClass: EarthDragon_Skin, amount: 8}];

  EarthDragon_Coat.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Coat.prototype.constructor = EarthDragon_Coat;

  EarthDragon_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = EarthDragon_Coat.itemName;
    this.description = EarthDragon_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 120;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8 + this.bucState);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Coat);
  ItemUtils.equipTemplates[0].coat.push(EarthDragon_Coat);

  //-----------------------------------------------------------------------------------
  // IceDragon_Gloves
  //
  // armor type: GLOVES

  IceDragon_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Gloves.itemName = '龍皮手套(冰)';
  IceDragon_Gloves.itemDescription = '蘊含神秘力量的手套';
  IceDragon_Gloves.material = [{itemClass: IceDragon_Skin, amount: 4}];

  IceDragon_Gloves.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Gloves.prototype.constructor = IceDragon_Gloves;

  IceDragon_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = IceDragon_Gloves.itemName;
    this.description = IceDragon_Gloves.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.cold = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Gloves);
  ItemUtils.equipTemplates[1].gloves.push(IceDragon_Gloves);

  //-----------------------------------------------------------------------------------
  // IceDragon_Shoes
  //
  // armor type: SHOES

  IceDragon_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Shoes.itemName = '龍皮靴(冰)';
  IceDragon_Shoes.itemDescription = '蘊含神秘力量的靴子';
  IceDragon_Shoes.material = [{itemClass: IceDragon_Skin, amount: 4}];

  IceDragon_Shoes.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Shoes.prototype.constructor = IceDragon_Shoes;

  IceDragon_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = IceDragon_Shoes.itemName;
    this.description = IceDragon_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.cold = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Shoes);
  ItemUtils.equipTemplates[1].shoes.push(IceDragon_Shoes);

  //-----------------------------------------------------------------------------------
  // IceDragon_Shield
  //
  // armor type: SHIELD

  IceDragon_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Shield.itemName = '龍皮盾(冰)';
  IceDragon_Shield.itemDescription = '蘊含神秘力量的皮盾';
  IceDragon_Shield.material = [{itemClass: IceDragon_Skin, amount: 3}, {itemClass: IceDragon_Bone, amount: 3}];

  IceDragon_Shield.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Shield.prototype.constructor = IceDragon_Shield;

  IceDragon_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = IceDragon_Shield.itemName;
    this.description = IceDragon_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 50;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    this.resistance.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Shield);
  ItemUtils.equipTemplates[1].shield.push(IceDragon_Shield);

  //-----------------------------------------------------------------------------------
  // IceDragon_Helmet
  //
  // armor type: HELMET

  IceDragon_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Helmet.itemName = '龍皮帽(冰)';
  IceDragon_Helmet.itemDescription = '蘊含神秘力量的皮帽';
  IceDragon_Helmet.material = [{itemClass: IceDragon_Skin, amount: 4}];

  IceDragon_Helmet.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Helmet.prototype.constructor = IceDragon_Helmet;

  IceDragon_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = IceDragon_Helmet.itemName;
    this.description = IceDragon_Helmet.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.cold = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Helmet);
  ItemUtils.equipTemplates[1].helmet.push(IceDragon_Helmet);

  //-----------------------------------------------------------------------------------
  // IceDragon_Coat
  //
  // armor type: COAT

  IceDragon_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Coat.itemName = '龍皮大衣(冰)';
  IceDragon_Coat.itemDescription = '蘊含神秘力量的大衣';
  IceDragon_Coat.material = [{itemClass: IceDragon_Skin, amount: 8}];

  IceDragon_Coat.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Coat.prototype.constructor = IceDragon_Coat;

  IceDragon_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = IceDragon_Coat.itemName;
    this.description = IceDragon_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 120;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8 + this.bucState);
    this.resistance.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Coat);
  ItemUtils.equipTemplates[1].coat.push(IceDragon_Coat);

  //-----------------------------------------------------------------------------------
  // Ice_Coat
  //
  // armor type: COAT

  Ice_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  Ice_Coat.itemName = '冰雪之衣';
  Ice_Coat.itemDescription = '冰涼的輕薄衣裝';

  Ice_Coat.prototype = Object.create(EquipTemplate.prototype);
  Ice_Coat.prototype.constructor = Ice_Coat;

  Ice_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Ice_Coat.itemName;
    this.description = Ice_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 40;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8 + this.bucState);
    this.resistance.elemental.cold = 0.3;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.equipTemplates[1].coat.push(Ice_Coat);

  //-----------------------------------------------------------------------------------
  // Salamander_Gloves
  //
  // armor type: GLOVES

  Salamander_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Gloves.itemName = '火蜥蜴皮手套';
  Salamander_Gloves.itemDescription = '發燙的手套';
  Salamander_Gloves.material = [{itemClass: Salamander_Skin, amount: 4}];

  Salamander_Gloves.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Gloves.prototype.constructor = Salamander_Gloves;

  Salamander_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = Salamander_Gloves.itemName;
    this.description = Salamander_Gloves.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Gloves);
  ItemUtils.equipTemplates[2].gloves.push(Salamander_Gloves);

  //-----------------------------------------------------------------------------------
  // Salamander_Shoes
  //
  // armor type: SHOES

  Salamander_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Shoes.itemName = '火蜥蜴皮靴';
  Salamander_Shoes.itemDescription = '發燙的靴子';
  Salamander_Shoes.material = [{itemClass: Salamander_Skin, amount: 4}];

  Salamander_Shoes.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Shoes.prototype.constructor = Salamander_Shoes;

  Salamander_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = Salamander_Shoes.itemName;
    this.description = Salamander_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Shoes);
  ItemUtils.equipTemplates[2].shoes.push(Salamander_Shoes);

  //-----------------------------------------------------------------------------------
  // Salamander_Shield
  //
  // armor type: SHIELD

  Salamander_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Shield.itemName = '火蜥蜴皮盾';
  Salamander_Shield.itemDescription = '發燙的皮盾';
  Salamander_Shield.material = [{itemClass: Salamander_Skin, amount: 3}, {itemClass: Salamander_Bone, amount: 3}];

  Salamander_Shield.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Shield.prototype.constructor = Salamander_Shield;

  Salamander_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = Salamander_Shield.itemName;
    this.description = Salamander_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 50;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    this.resistance.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Shield);
  ItemUtils.equipTemplates[2].shield.push(Salamander_Shield);

  //-----------------------------------------------------------------------------------
  // Salamander_Helmet
  //
  // armor type: HELMET

  Salamander_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Helmet.itemName = '火蜥蜴皮帽';
  Salamander_Helmet.itemDescription = '發燙的皮帽';
  Salamander_Helmet.material = [{itemClass: Salamander_Skin, amount: 4}];

  Salamander_Helmet.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Helmet.prototype.constructor = Salamander_Helmet;

  Salamander_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = Salamander_Helmet.itemName;
    this.description = Salamander_Helmet.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Helmet);
  ItemUtils.equipTemplates[2].helmet.push(Salamander_Helmet);

  //-----------------------------------------------------------------------------------
  // Salamander_Coat
  //
  // armor type: COAT

  Salamander_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Coat.itemName = '火蜥蜴皮大衣';
  Salamander_Coat.itemDescription = '發燙的大衣';
  Salamander_Coat.material = [{itemClass: Salamander_Skin, amount: 8}];

  Salamander_Coat.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Coat.prototype.constructor = Salamander_Coat;

  Salamander_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Salamander_Coat.itemName;
    this.description = Salamander_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 120;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 3 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 4 + this.bucState);
    this.resistance.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Coat);
  ItemUtils.equipTemplates[2].coat.push(Salamander_Coat);

  //-----------------------------------------------------------------------------------
  // FireDragon_Gloves
  //
  // armor type: GLOVES

  FireDragon_Gloves = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Gloves.itemName = '龍皮手套(火)';
  FireDragon_Gloves.itemDescription = '蘊含神秘力量的手套';
  FireDragon_Gloves.material = [{itemClass: FireDragon_Skin, amount: 4}];

  FireDragon_Gloves.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Gloves.prototype.constructor = FireDragon_Gloves;

  FireDragon_Gloves.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[12]);
    this.name = FireDragon_Gloves.itemName;
    this.description = FireDragon_Gloves.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Gloves);
  ItemUtils.equipTemplates[2].gloves.push(FireDragon_Gloves);

  //-----------------------------------------------------------------------------------
  // FireDragon_Shoes
  //
  // armor type: SHOES

  FireDragon_Shoes = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Shoes.itemName = '龍皮靴(火)';
  FireDragon_Shoes.itemDescription = '蘊含神秘力量的靴子';
  FireDragon_Shoes.material = [{itemClass: FireDragon_Skin, amount: 4}];

  FireDragon_Shoes.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Shoes.prototype.constructor = FireDragon_Shoes;

  FireDragon_Shoes.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[13]);
    this.name = FireDragon_Shoes.itemName;
    this.description = FireDragon_Shoes.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Shoes);
  ItemUtils.equipTemplates[2].shoes.push(FireDragon_Shoes);

  //-----------------------------------------------------------------------------------
  // FireDragon_Shield
  //
  // armor type: SHIELD

  FireDragon_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Shield.itemName = '龍皮盾(火)';
  FireDragon_Shield.itemDescription = '蘊含神秘力量的皮盾';
  FireDragon_Shield.material = [{itemClass: FireDragon_Skin, amount: 3}, {itemClass: FireDragon_Bone, amount: 3}];

  FireDragon_Shield.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Shield.prototype.constructor = FireDragon_Shield;

  FireDragon_Shield.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[14]);
    this.name = FireDragon_Shield.itemName;
    this.description = FireDragon_Shield.itemDescription;
    this.templateName = this.name;
    this.weight = 50;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 2 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 2 + this.bucState);
    this.resistance.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Shield);
  ItemUtils.equipTemplates[2].shield.push(FireDragon_Shield);

  //-----------------------------------------------------------------------------------
  // FireDragon_Helmet
  //
  // armor type: HELMET

  FireDragon_Helmet = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Helmet.itemName = '龍皮帽(火)';
  FireDragon_Helmet.itemDescription = '蘊含神秘力量的皮帽';
  FireDragon_Helmet.material = [{itemClass: FireDragon_Skin, amount: 4}];

  FireDragon_Helmet.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Helmet.prototype.constructor = FireDragon_Helmet;

  FireDragon_Helmet.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[15]);
    this.name = FireDragon_Helmet.itemName;
    this.description = FireDragon_Helmet.itemDescription;
    this.templateName = this.name;
    this.weight = 10;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], this.bucState);
    ItemUtils.modifyAttr(this.traits[1], this.bucState);
    this.resistance.elemental.fire = 0.1;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Helmet);
  ItemUtils.equipTemplates[2].helmet.push(FireDragon_Helmet);

  //-----------------------------------------------------------------------------------
  // FireDragon_Coat
  //
  // armor type: COAT

  FireDragon_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Coat.itemName = '龍皮大衣(火)';
  FireDragon_Coat.itemDescription = '蘊含神秘力量的大衣';
  FireDragon_Coat.material = [{itemClass: FireDragon_Skin, amount: 8}];

  FireDragon_Coat.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Coat.prototype.constructor = FireDragon_Coat;

  FireDragon_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = FireDragon_Coat.itemName;
    this.description = FireDragon_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 120;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8 + this.bucState);
    this.resistance.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Coat);
  ItemUtils.equipTemplates[2].coat.push(FireDragon_Coat);

  //-----------------------------------------------------------------------------------
  // Fire_Coat
  //
  // armor type: COAT

  Fire_Coat = function() {
    this.initialize.apply(this, arguments);
  }

  Fire_Coat.itemName = '火焰之衣';
  Fire_Coat.itemDescription = '燃燒的溫熱衣裝';

  Fire_Coat.prototype = Object.create(EquipTemplate.prototype);
  Fire_Coat.prototype.constructor = Fire_Coat;

  Fire_Coat.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[16]);
    this.name = Fire_Coat.itemName;
    this.description = Fire_Coat.itemDescription;
    this.templateName = this.name;
    this.weight = 40;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 8 + this.bucState);
    ItemUtils.modifyAttr(this.traits[1], 8 + this.bucState);
    this.resistance.elemental.fire = 0.3;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.equipTemplates[2].coat.push(Fire_Coat);

  //-----------------------------------------------------------------------------------
  // Ring_FireResistance
  // 
  // armor type: ACCESSORY

  Ring_FireResistance = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_FireResistance.itemName = '耐火戒指';
  Ring_FireResistance.itemDescription = '減低火屬性傷害';

  Ring_FireResistance.prototype = Object.create(EquipTemplate.prototype);
  Ring_FireResistance.prototype.constructor = Ring_FireResistance;

  Ring_FireResistance.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 4;
    this.bucState = 0;
    this.name = Ring_FireResistance.itemName;
    this.description = Ring_FireResistance.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    this.resistance.elemental.fire = 0.3;
    // randomize attributes
    ItemUtils.updateEquipDescription(this);
  };

  //-----------------------------------------------------------------------------------
  // Ring_Protection
  // 
  // armor type: ACCESSORY

  Ring_Protection = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_Protection.itemName = '守護戒指';
  Ring_Protection.itemDescription = '提高護甲強度';
  Ring_Protection.material = [{itemClass: Buffalo_Horn, amount: 4}, {itemClass: Rat_Tail, amount: 1}];

  Ring_Protection.prototype = Object.create(EquipTemplate.prototype);
  Ring_Protection.prototype.constructor = Ring_Protection;

  Ring_Protection.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 0;
    this.bucState = 0;
    this.name = Ring_Protection.itemName;
    this.description = Ring_Protection.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[0], 16);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Ring_Protection);

  //-----------------------------------------------------------------------------------
  // Ring_MagicResistance
  // 
  // armor type: ACCESSORY

  Ring_MagicResistance = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_MagicResistance.itemName = '抗魔戒指';
  Ring_MagicResistance.itemDescription = '提高魔法防禦';
  Ring_MagicResistance.material = [{itemClass: Glue, amount: 2}, {itemClass: Blue_Crystal, amount: 2}, {itemClass: Rat_Tail, amount: 1}];

  Ring_MagicResistance.prototype = Object.create(EquipTemplate.prototype);
  Ring_MagicResistance.prototype.constructor = Ring_MagicResistance;

  Ring_MagicResistance.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 1;
    this.bucState = 0;
    this.name = Ring_MagicResistance.itemName;
    this.description = Ring_MagicResistance.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    ItemUtils.modifyAttr(this.traits[1], 16);
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Ring_MagicResistance);

  //-----------------------------------------------------------------------------------
  // Ring_ParalyzeResistance
  // 
  // armor type: ACCESSORY

  Ring_ParalyzeResistance = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_ParalyzeResistance.itemName = '抗麻戒指';
  Ring_ParalyzeResistance.itemDescription = '橡膠觸感的戒指';
  Ring_ParalyzeResistance.material = [{itemClass: Glue, amount: 4}, {itemClass: Rat_Tail, amount: 1}];

  Ring_ParalyzeResistance.prototype = Object.create(EquipTemplate.prototype);
  Ring_ParalyzeResistance.prototype.constructor = Ring_ParalyzeResistance;

  Ring_ParalyzeResistance.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 2;
    this.bucState = 0;
    this.name = Ring_ParalyzeResistance.itemName;
    this.description = Ring_ParalyzeResistance.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    this.resistance.state.paralyze = 1;
    // randomize attributes
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Ring_ParalyzeResistance);

  //-----------------------------------------------------------------------------------
  // Ring_AcidResistance
  // 
  // armor type: ACCESSORY

  Ring_AcidResistance = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_AcidResistance.itemName = '抗酸戒指';
  Ring_AcidResistance.itemDescription = '酸蝕傷害減半, 裝備不受酸蝕傷害';
  Ring_AcidResistance.material = [{itemClass: Mucus, amount: 4}, {itemClass: Rat_Tail, amount: 1}];

  Ring_AcidResistance.prototype = Object.create(EquipTemplate.prototype);
  Ring_AcidResistance.prototype.constructor = Ring_AcidResistance;

  Ring_AcidResistance.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 3;
    this.bucState = 0;
    this.name = Ring_AcidResistance.itemName;
    this.description = Ring_AcidResistance.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    this.resistance.state.acid = 1;
    // randomize attributes
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Ring_AcidResistance);

  //-----------------------------------------------------------------------------------
  // Ring_ColdResistance
  // 
  // armor type: ACCESSORY

  Ring_ColdResistance = function() {
    this.initialize.apply(this, arguments);
  }

  Ring_ColdResistance.itemName = '抗寒戒指';
  Ring_ColdResistance.itemDescription = '減低冰屬性傷害';

  Ring_ColdResistance.prototype = Object.create(EquipTemplate.prototype);
  Ring_ColdResistance.prototype.constructor = Ring_ColdResistance;

  Ring_ColdResistance.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataArmors[18]);
    this.id = 4;
    this.bucState = 0;
    this.name = Ring_ColdResistance.itemName;
    this.description = Ring_ColdResistance.itemDescription;
    this.templateName = this.name;
    this.weight = 2;
    ItemUtils.updateEquipName(this);
    this.resistance.elemental.cold = 0.3;
    // randomize attributes
    ItemUtils.updateEquipDescription(this);
  };

  //-----------------------------------------------------------------------------------
  // Dog_Scimitar
  //
  // weapon type: SCIMITAR

  Dog_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Scimitar.itemName = '骨刃(犬)';
  Dog_Scimitar.itemDescription = '輕薄的長刀';
  Dog_Scimitar.material = [{itemClass: Dog_Bone, amount: 2}, {itemClass: Rooster_Claw, amount: 4}];

  Dog_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Dog_Scimitar.prototype.constructor = Dog_Scimitar;

  Dog_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Dog_Scimitar.itemName;
    this.description = Dog_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '3d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(Dog_Scimitar);

  //-----------------------------------------------------------------------------------
  // Cat_Scimitar
  //
  // weapon type: SCIMITAR

  Cat_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Scimitar.itemName = '骨刃(貓)';
  Cat_Scimitar.itemDescription = '泛著光澤的長刀';
  Cat_Scimitar.material = [{itemClass: Cat_Bone, amount: 2}, {itemClass: Cat_Claw, amount: 4}];

  Cat_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Cat_Scimitar.prototype.constructor = Cat_Scimitar;

  Cat_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Cat_Scimitar.itemName;
    this.description = Cat_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '3d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(Cat_Scimitar);

  //-----------------------------------------------------------------------------------
  // Wolf_Scimitar
  //
  // weapon type: SCIMITAR

  Wolf_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Scimitar.itemName = '骨刃(狼)';
  Wolf_Scimitar.itemDescription = '堅韌的長刀';
  Wolf_Scimitar.material = [{itemClass: Wolf_Bone, amount: 2}, {itemClass: Wolf_Claw, amount: 4}];

  Wolf_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Scimitar.prototype.constructor = Wolf_Scimitar;

  Wolf_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Wolf_Scimitar.itemName;
    this.description = Wolf_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '3d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(Wolf_Scimitar);

  //-----------------------------------------------------------------------------------
  // Bear_Scimitar
  //
  // weapon type: SCIMITAR

  Bear_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Scimitar.itemName = '骨刃(熊)';
  Bear_Scimitar.itemDescription = '厚實的長刀';
  Bear_Scimitar.material = [{itemClass: Bear_Bone, amount: 2}, {itemClass: Bear_Claw, amount: 4}];

  Bear_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Bear_Scimitar.prototype.constructor = Bear_Scimitar;

  Bear_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Bear_Scimitar.itemName;
    this.description = Bear_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '3d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(Bear_Scimitar);

  //-----------------------------------------------------------------------------------
  // Lion_Scimitar
  //
  // weapon type: SCIMITAR

  Lion_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Scimitar.itemName = '骨刃(獅)';
  Lion_Scimitar.itemDescription = '大貓骨長刀';
  Lion_Scimitar.material = [{itemClass: Lion_Bone, amount: 2}, {itemClass: Lion_Claw, amount: 4}];

  Lion_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Lion_Scimitar.prototype.constructor = Lion_Scimitar;

  Lion_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Lion_Scimitar.itemName;
    this.description = Lion_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 5);
    modifier += this.bucState;
    this.traits[2].value = '3d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(Lion_Scimitar);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Scimitar
  //
  // weapon type: SCIMITAR

  EarthDragon_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Scimitar.itemName = '龍骨刃(岩)';
  EarthDragon_Scimitar.itemDescription = '閃著黑光的長刀';
  EarthDragon_Scimitar.material = [{itemClass: EarthDragon_Bone, amount: 2}, {itemClass: EarthDragon_Claw, amount: 4}];

  EarthDragon_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Scimitar.prototype.constructor = EarthDragon_Scimitar;

  EarthDragon_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = EarthDragon_Scimitar.itemName;
    this.description = EarthDragon_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(3, 6);
    modifier += this.bucState;
    this.traits[2].value = '3d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Scimitar);
  ItemUtils.equipTemplates[0].weapon.push(EarthDragon_Scimitar);

  //-----------------------------------------------------------------------------------
  // IceDragon_Scimitar
  //
  // weapon type: SCIMITAR

  IceDragon_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Scimitar.itemName = '龍骨刃(冰)';
  IceDragon_Scimitar.itemDescription = '寒氣逼人的長刀';
  IceDragon_Scimitar.material = [{itemClass: IceDragon_Bone, amount: 2}, {itemClass: IceDragon_Claw, amount: 4}];

  IceDragon_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Scimitar.prototype.constructor = IceDragon_Scimitar;

  IceDragon_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = IceDragon_Scimitar.itemName;
    this.description = IceDragon_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '3d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Scimitar);
  ItemUtils.equipTemplates[1].weapon.push(IceDragon_Scimitar);

  //-----------------------------------------------------------------------------------
  // Salamander_Scimitar
  //
  // weapon type: SCIMITAR

  Salamander_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Scimitar.itemName = '火蜥蜴刃';
  Salamander_Scimitar.itemDescription = '發燙的長刀';
  Salamander_Scimitar.material = [{itemClass: Salamander_Bone, amount: 2}, {itemClass: Salamander_Claw, amount: 4}];

  Salamander_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Scimitar.prototype.constructor = Salamander_Scimitar;

  Salamander_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = Salamander_Scimitar.itemName;
    this.description = Salamander_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 5);
    modifier += this.bucState;
    this.traits[2].value = '3d2';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Scimitar);
  ItemUtils.equipTemplates[2].weapon.push(Salamander_Scimitar);

  //-----------------------------------------------------------------------------------
  // FireDragon_Scimitar
  //
  // weapon type: SCIMITAR

  FireDragon_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Scimitar.itemName = '龍骨刃(火)';
  FireDragon_Scimitar.itemDescription = '散發著高熱的長刀';
  FireDragon_Scimitar.material = [{itemClass: FireDragon_Bone, amount: 2}, {itemClass: FireDragon_Claw, amount: 4}];

  FireDragon_Scimitar.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Scimitar.prototype.constructor = FireDragon_Scimitar;

  FireDragon_Scimitar.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[14]);
    this.name = FireDragon_Scimitar.itemName;
    this.description = FireDragon_Scimitar.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(1, 4);
    modifier += this.bucState;
    this.traits[2].value = '3d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Scimitar);
  ItemUtils.equipTemplates[2].weapon.push(FireDragon_Scimitar);

  //-----------------------------------------------------------------------------------
  // Dog_Spear
  //
  // weapon type: SPEAR

  Dog_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Spear.itemName = '骨矛(犬)';
  Dog_Spear.itemDescription = '輕薄的長矛';
  Dog_Spear.material = [{itemClass: Dog_Bone, amount: 2}, {itemClass: Dog_Tooth, amount: 4}];

  Dog_Spear.prototype = Object.create(EquipTemplate.prototype);
  Dog_Spear.prototype.constructor = Dog_Spear;

  Dog_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = Dog_Spear.itemName;
    this.description = Dog_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = 0;
    modifier += this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Spear);
  ItemUtils.equipTemplates[0].weapon.push(Dog_Spear);

  //-----------------------------------------------------------------------------------
  // Cat_Spear
  //
  // weapon type: SPEAR

  Cat_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Spear.itemName = '骨矛(貓)';
  Cat_Spear.itemDescription = '泛著光澤的長矛';
  Cat_Spear.material = [{itemClass: Cat_Bone, amount: 2}, {itemClass: Cat_Tooth, amount: 4}];

  Cat_Spear.prototype = Object.create(EquipTemplate.prototype);
  Cat_Spear.prototype.constructor = Cat_Spear;

  Cat_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = Cat_Spear.itemName;
    this.description = Cat_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 3);
    modifier += this.bucState;
    this.traits[2].value = '2d3';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Spear);
  ItemUtils.equipTemplates[0].weapon.push(Cat_Spear);

  //-----------------------------------------------------------------------------------
  // Wolf_Spear
  //
  // weapon type: SPEAR

  Wolf_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Spear.itemName = '骨矛(狼)';
  Wolf_Spear.itemDescription = '堅韌的長矛';
  Wolf_Spear.material = [{itemClass: Wolf_Bone, amount: 2}, {itemClass: Wolf_Tooth, amount: 4}];

  Wolf_Spear.prototype = Object.create(EquipTemplate.prototype);
  Wolf_Spear.prototype.constructor = Wolf_Spear;

  Wolf_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = Wolf_Spear.itemName;
    this.description = Wolf_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 2);
    modifier += this.bucState;
    this.traits[2].value = '2d4';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Spear);
  ItemUtils.equipTemplates[0].weapon.push(Wolf_Spear);

  //-----------------------------------------------------------------------------------
  // Lion_Spear
  //
  // weapon type: SPEAR

  Lion_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Spear.itemName = '骨矛(獅)';
  Lion_Spear.itemDescription = '大貓骨長矛';
  Lion_Spear.material = [{itemClass: Lion_Bone, amount: 2}, {itemClass: Lion_Tooth, amount: 4}];

  Lion_Spear.prototype = Object.create(EquipTemplate.prototype);
  Lion_Spear.prototype.constructor = Lion_Spear;

  Lion_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = Lion_Spear.itemName;
    this.description = Lion_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = 0;
    modifier += this.bucState;
    this.traits[2].value = '2d5';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Spear);
  ItemUtils.equipTemplates[0].weapon.push(Lion_Spear);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Spear
  //
  // weapon type: SPEAR

  EarthDragon_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Spear.itemName = '龍骨矛(岩)';
  EarthDragon_Spear.itemDescription = '閃著黑光的長矛';
  EarthDragon_Spear.material = [{itemClass: EarthDragon_Bone, amount: 2}, {itemClass: EarthDragon_Tooth, amount: 4}];

  EarthDragon_Spear.prototype = Object.create(EquipTemplate.prototype);
  EarthDragon_Spear.prototype.constructor = EarthDragon_Spear;

  EarthDragon_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = EarthDragon_Spear.itemName;
    this.description = EarthDragon_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(2, 4);
    modifier += this.bucState;
    this.traits[2].value = '2d6';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Spear);
  ItemUtils.equipTemplates[0].weapon.push(EarthDragon_Spear);

  //-----------------------------------------------------------------------------------
  // IceDragon_Spear
  //
  // weapon type: SPEAR

  IceDragon_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Spear.itemName = '龍骨矛(冰)';
  IceDragon_Spear.itemDescription = '寒氣逼人的長矛';
  IceDragon_Spear.material = [{itemClass: IceDragon_Bone, amount: 2}, {itemClass: IceDragon_Tooth, amount: 4}];

  IceDragon_Spear.prototype = Object.create(EquipTemplate.prototype);
  IceDragon_Spear.prototype.constructor = IceDragon_Spear;

  IceDragon_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = IceDragon_Spear.itemName;
    this.description = IceDragon_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 2);
    modifier += this.bucState;
    this.traits[2].value = '2d6';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Spear);
  ItemUtils.equipTemplates[1].weapon.push(IceDragon_Spear);

  //-----------------------------------------------------------------------------------
  // Salamander_Spear
  //
  // weapon type: SPEAR

  Salamander_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Spear.itemName = '火蜥蜴矛';
  Salamander_Spear.itemDescription = '發燙的長矛';
  Salamander_Spear.material = [{itemClass: Salamander_Bone, amount: 2}, {itemClass: Salamander_Tooth, amount: 4}];

  Salamander_Spear.prototype = Object.create(EquipTemplate.prototype);
  Salamander_Spear.prototype.constructor = Salamander_Spear;

  Salamander_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = Salamander_Spear.itemName;
    this.description = Salamander_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
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
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Spear);
  ItemUtils.equipTemplates[2].weapon.push(Salamander_Spear);

  //-----------------------------------------------------------------------------------
  // FireDragon_Spear
  //
  // weapon type: SPEAR

  FireDragon_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Spear.itemName = '龍骨矛(火)';
  FireDragon_Spear.itemDescription = '散發著高熱的長矛';
  FireDragon_Spear.material = [{itemClass: FireDragon_Bone, amount: 2}, {itemClass: FireDragon_Tooth, amount: 4}];

  FireDragon_Spear.prototype = Object.create(EquipTemplate.prototype);
  FireDragon_Spear.prototype.constructor = FireDragon_Spear;

  FireDragon_Spear.prototype.initialize = function () {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[15]);
    this.name = FireDragon_Spear.itemName;
    this.description = FireDragon_Spear.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    let modifier = getRandomIntRange(0, 2);
    modifier += this.bucState;
    this.traits[2].value = '2d6';
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Spear);
  ItemUtils.equipTemplates[2].weapon.push(FireDragon_Spear);

  //-----------------------------------------------------------------------------------
  // StaffTemplate
  //
  // template for weapon type: STAFF

  StaffTemplate = function() {
    this.initialize.apply(this, arguments);
  }

  StaffTemplate.prototype = Object.create(EquipTemplate.prototype);
  StaffTemplate.prototype.constructor = StaffTemplate;

  StaffTemplate.prototype.initialize = function(manaReducedPercentage) {
    EquipTemplate.prototype.initialize.call(this, $dataWeapons[16]);
    this._manaReducedPercentage = manaReducedPercentage;
  }

  StaffTemplate.prototype.manaReducedPercentage = function() {
    return this._manaReducedPercentage;
  }

  //-----------------------------------------------------------------------------------
  // Dog_Staff
  //
  // weapon type: STAFF

  Dog_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Dog_Staff.itemName = '骨杖(犬)';
  Dog_Staff.itemDescription = '輕薄的法杖';
  Dog_Staff.material = [{itemClass: Dog_Bone, amount: 4}];

  Dog_Staff.prototype = Object.create(StaffTemplate.prototype);
  Dog_Staff.prototype.constructor = Dog_Staff;

  Dog_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 5);
    this.name = Dog_Staff.itemName;
    this.description = Dog_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d2';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Dog_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Dog_Staff);

  //-----------------------------------------------------------------------------------
  // Cat_Staff
  //
  // weapon type: STAFF

  Cat_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Cat_Staff.itemName = '骨杖(貓)';
  Cat_Staff.itemDescription = '泛著光澤的法杖';
  Cat_Staff.material = [{itemClass: Cat_Bone, amount: 4}];

  Cat_Staff.prototype = Object.create(StaffTemplate.prototype);
  Cat_Staff.prototype.constructor = Cat_Staff;

  Cat_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 10);
    this.name = Cat_Staff.itemName;
    this.description = Cat_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d3';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Cat_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Cat_Staff);

  //-----------------------------------------------------------------------------------
  // Wolf_Staff
  //
  // weapon type: STAFF

  Wolf_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Wolf_Staff.itemName = '骨杖(狼)';
  Wolf_Staff.itemDescription = '堅韌的法杖';
  Wolf_Staff.material = [{itemClass: Wolf_Bone, amount: 4}];

  Wolf_Staff.prototype = Object.create(StaffTemplate.prototype);
  Wolf_Staff.prototype.constructor = Wolf_Staff;

  Wolf_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 15);
    this.name = Wolf_Staff.itemName;
    this.description = Wolf_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Wolf_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Wolf_Staff);

  //-----------------------------------------------------------------------------------
  // Bear_Staff
  //
  // weapon type: STAFF

  Bear_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Bear_Staff.itemName = '骨杖(熊)';
  Bear_Staff.itemDescription = '厚實的法杖';
  Bear_Staff.material = [{itemClass: Bear_Bone, amount: 4}];

  Bear_Staff.prototype = Object.create(StaffTemplate.prototype);
  Bear_Staff.prototype.constructor = Bear_Staff;

  Bear_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 20);
    this.name = Bear_Staff.itemName;
    this.description = Bear_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d5';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Bear_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Bear_Staff);

  //-----------------------------------------------------------------------------------
  // Buffalo_Staff
  //
  // weapon type: STAFF

  Buffalo_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Buffalo_Staff.itemName = '骨杖(牛)';
  Buffalo_Staff.itemDescription = '拿著就會有牛脾氣?';
  Buffalo_Staff.material = [{itemClass: Buffalo_Bone, amount: 4}];

  Buffalo_Staff.prototype = Object.create(StaffTemplate.prototype);
  Buffalo_Staff.prototype.constructor = Buffalo_Staff;

  Buffalo_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 25);
    this.name = Buffalo_Staff.itemName;
    this.description = Buffalo_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d6';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Buffalo_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Buffalo_Staff);

  //-----------------------------------------------------------------------------------
  // Lion_Staff
  //
  // weapon type: STAFF

  Lion_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Lion_Staff.itemName = '骨杖(獅)';
  Lion_Staff.itemDescription = '大貓骨杖';
  Lion_Staff.material = [{itemClass: Lion_Bone, amount: 4}];

  Lion_Staff.prototype = Object.create(StaffTemplate.prototype);
  Lion_Staff.prototype.constructor = Lion_Staff;

  Lion_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 30);
    this.name = Lion_Staff.itemName;
    this.description = Lion_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d7';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Lion_Staff);
  ItemUtils.equipTemplates[0].weapon.push(Lion_Staff);

  //-----------------------------------------------------------------------------------
  // EarthDragon_Staff
  //
  // weapon type: STAFF

  EarthDragon_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  EarthDragon_Staff.itemName = '龍骨杖(岩)';
  EarthDragon_Staff.itemDescription = '閃著黑光的法杖';
  EarthDragon_Staff.material = [{itemClass: EarthDragon_Bone, amount: 4}];

  EarthDragon_Staff.prototype = Object.create(StaffTemplate.prototype);
  EarthDragon_Staff.prototype.constructor = EarthDragon_Staff;

  EarthDragon_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 35);
    this.name = EarthDragon_Staff.itemName;
    this.description = EarthDragon_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d8+2';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(EarthDragon_Staff);
  ItemUtils.equipTemplates[0].weapon.push(EarthDragon_Staff);

  //-----------------------------------------------------------------------------------
  // IceDragon_Staff
  //
  // weapon type: STAFF

  IceDragon_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  IceDragon_Staff.itemName = '龍骨杖(冰)';
  IceDragon_Staff.itemDescription = '寒氣逼人的法杖';
  IceDragon_Staff.material = [{itemClass: IceDragon_Bone, amount: 4}];

  IceDragon_Staff.prototype = Object.create(StaffTemplate.prototype);
  IceDragon_Staff.prototype.constructor = IceDragon_Staff;

  IceDragon_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 35);
    this.name = IceDragon_Staff.itemName;
    this.description = IceDragon_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d8';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    this.damageType.elemental.cold = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(IceDragon_Staff);
  ItemUtils.equipTemplates[1].weapon.push(IceDragon_Staff);

  //-----------------------------------------------------------------------------------
  // Salamander_Staff
  //
  // weapon type: STAFF

  Salamander_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Salamander_Staff.itemName = '火蜥蜴杖';
  Salamander_Staff.itemDescription = '發燙的法杖';
  Salamander_Staff.material = [{itemClass: Salamander_Bone, amount: 4}];

  Salamander_Staff.prototype = Object.create(StaffTemplate.prototype);
  Salamander_Staff.prototype.constructor = Salamander_Staff;

  Salamander_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 15);
    this.name = Salamander_Staff.itemName;
    this.description = Salamander_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d4';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(Salamander_Staff);
  ItemUtils.equipTemplates[2].weapon.push(Salamander_Staff);

  //-----------------------------------------------------------------------------------
  // FireDragon_Staff
  //
  // weapon type: STAFF

  FireDragon_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  FireDragon_Staff.itemName = '龍骨杖(火)';
  FireDragon_Staff.itemDescription = '散發著高熱的法杖';
  FireDragon_Staff.material = [{itemClass: FireDragon_Bone, amount: 4}];

  FireDragon_Staff.prototype = Object.create(StaffTemplate.prototype);
  FireDragon_Staff.prototype.constructor = FireDragon_Staff;

  FireDragon_Staff.prototype.initialize = function () {
    StaffTemplate.prototype.initialize.call(this, 35);
    this.name = FireDragon_Staff.itemName;
    this.description = FireDragon_Staff.itemDescription;
    this.templateName = this.name;
    this.weight = 15;
    ItemUtils.updateEquipName(this);
    // randomize attributes
    this.traits[2].value = '1d8';
    let modifier = this.bucState;
    if (modifier > 0) {
      this.traits[2].value += '+' + modifier;
    } else if (modifier < 0) {
      this.traits[2].value += modifier;
    }
    this.params[4] = 4;
    this.damageType.elemental.fire = 0.2;
    ItemUtils.updateEquipDescription(this);
  };
  ItemUtils.recipes.push(FireDragon_Staff);
  ItemUtils.equipTemplates[2].weapon.push(FireDragon_Staff);

  //-----------------------------------------------------------------------------------
  // Potion_Heal
  //
  // item id 31

  Potion_Heal = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Heal.itemName = '治療藥水';
  Potion_Heal.itemDescription = '回復些許生命力';
  Potion_Heal.material = [{itemClass: Phoenix_Blood, amount: 2}, {itemClass: FireHorse_Tail, amount: 2}];

  Potion_Heal.prototype = Object.create(ItemTemplate.prototype);
  Potion_Heal.prototype.constructor = Potion_Heal;

  Potion_Heal.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 0;
    this.name = Potion_Heal.itemName;
    this.description = Potion_Heal.itemDescription;
    this.weight = 15;
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
  ItemUtils.recipes.push(Potion_Heal);

  //-----------------------------------------------------------------------------------
  // Potion_Mana
  //
  // potion id 1

  Potion_Mana = function() {
    this.initialize.apply(this, arguments);
  }

  Potion_Mana.prototype = Object.create(ItemTemplate.prototype);
  Potion_Mana.prototype.constructor = Potion_Mana;

  Potion_Mana.itemName = '魔力藥水';
  Potion_Mana.itemDescription = '回復些許魔力';
  Potion_Mana.material = [{itemClass: Phoenix_Blood, amount: 2}, {itemClass: Tentacle, amount: 2}];

  Potion_Mana.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[6]);
    this.id = 1;
    this.name = Potion_Mana.itemName;
    this.description = Potion_Mana.itemDescription;
    this.weight = 15;
  }

  Potion_Mana.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let value = 30;
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
  ItemUtils.recipes.push(Potion_Mana);

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
    this.weight = 15;
  }

  Potion_Blind.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.blindEffect.turns = SkillUtils.getDebuffEffectCount(user, 10);
    TimeUtils.eventScheduler.addStatusEffect(user, 'blindEffect');
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
    this.weight = 15;
  }

  Potion_Paralyze.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    if (realUser.status.resistance.state.paralyze == 0) {
      realUser.status.paralyzeEffect.turns = SkillUtils.getDebuffEffectCount(user, 5);
      TimeUtils.eventScheduler.addStatusEffect(user, 'paralyzeEffect');
      if (CharUtils.playerCanSeeChar(user)) {
        TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 64));
        TimeUtils.animeQueue.push(new AnimeObject(user, 'POP_UP', '麻痺'));
        let msg = String.format(Message.display('paralyze'), LogUtils.getCharName(realUser));
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
        LogUtils.addLog(msg);
      }
    } else {
      if (CharUtils.playerCanSeeChar(user)) {
        TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 64));
        let msg = String.format(Message.display('paralyzeResisted'), LogUtils.getCharName(realUser));
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
        LogUtils.addLog(msg);
      }
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
    this.weight = 15;
  }

  Potion_Sleep.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.sleepEffect.turns = SkillUtils.getDebuffEffectCount(user, 20);
    TimeUtils.eventScheduler.addStatusEffect(user, 'sleepEffect');
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
    this.weight = 15;
  }

  Potion_Speed.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.speedUpEffect.turns = 20;
    TimeUtils.eventScheduler.addStatusEffect(user, 'speedUpEffect');
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
    this.weight = 15;
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
    this.weight = 15;
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
    this.weight = 15;
  }

  Potion_Invisible.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.invisibleEffect.turns = 20;
    TimeUtils.eventScheduler.addStatusEffect(user, 'invisibleEffect');
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
    this.weight = 15;
  }

  Potion_SeeInvisible.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.seeInvisibleEffect.turns = 40;
    TimeUtils.eventScheduler.addStatusEffect(user, 'seeInvisibleEffect');
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
    this.weight = 15;
  }

  Potion_Acid.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    let damage = 30;
    if (realUser.status.resistance.state.acid > 0) {
      damage /= 2;
    }
    CharUtils.decreaseHp(realUser, damage);
    let msg = String.format(Message.display('acidDamage'), LogUtils.getCharName(realUser), damage);
    // damage armor/weapon
    if (realUser.status.resistance.state.acid == 0) {
      Skill_Acid.damageEquip(user, realUser);
    }

    if (CharUtils.playerCanSeeChar(user)) {
      TimeUtils.animeQueue.push(new AnimeObject(user, 'ANIME', 39));
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
    this.weight = 15;
  }

  Potion_Poison.prototype.onQuaff = function(user, identifyObject) {
    let realUser = BattleUtils.getRealTarget(user);
    realUser.status.poisonEffect.turns = SkillUtils.getDebuffEffectCount(user, 10);
    TimeUtils.eventScheduler.addStatusEffect(user, 'poisonEffect');
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
    this.weight = 1;
  }

  Scroll_Identify.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let items = $gameParty.allItems().filter(function(item){
        return !ItemUtils.checkItemIdentified(item) && item.name != '鑑定卷軸';
      });
      let msg;
      if (items.length > 0) {
        SceneManager.push(Scene_Identify);
        if (identifyObject) {
          ItemUtils.identifyObject(this);
        }
      } else {
        msg = Message.display('scrollReadNoEffect');
        MapUtils.addBothLog(msg);
      }
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
    this.weight = 1;
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
    this.weight = 1;
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
    this.weight = 1;
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
    this.weight = 1;
  }

  Scroll_Teleport.prototype.onRead = function(user, identifyObject) {
    let mapBlocks = MapUtils.getMapBlocks($gameVariables[$gameMap._mapId].mapData);
    let positions = mapBlocks.floor.concat(mapBlocks.water);
    let floor = null;
    while (true) {
      floor = positions[Math.randomInt(positions.length)];
      if (MapUtils.isTileAvailableForMob($gameMap._mapId, MapDataUtils.getX(floor), MapDataUtils.getY(floor))
        && (MapDataUtils.getX(floor) != user._x && MapDataUtils.getY(floor) != user._y)) {
        break;
      }
    }
    let realUser = BattleUtils.getRealTarget(user);
    // disappear
    if (user != $gamePlayer && CharUtils.playerCanSeeChar(user)) {
      LogUtils.addLog(String.format(Message.display('seeTeleportAway'), LogUtils.getCharName(realUser)));
    }
    if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[user._x][user._y])) {
      AudioManager.playSe({name: "Run", pan: 0, pitch: 100, volume: 100});
    }

    user.setPosition(MapDataUtils.getX(floor), MapDataUtils.getY(floor));
    realUser.status.groundHoleTrapped = false;
    if (user == $gamePlayer) {
      $gamePlayer.center(MapDataUtils.getX(floor), MapDataUtils.getY(floor));
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
    this.weight = 1;
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
            equip.onRemove($gameActors.actor(1));
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
    this.weight = 1;
  }

  Scroll_CreateMonster.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let blocks = MapUtils.findAdjacentBlocks($gamePlayer);
      let msg, targetFloor;
      while (blocks.length > 0) {
        let id = getRandomInt(blocks.length);
        let floor = blocks[id];
        if (MapUtils.isTileAvailableForMob($gameMap.mapId(), floor.x, floor.y)) {
          targetFloor = floor;
          break;
        } else {
          blocks.splice(id, 1);
        }
      }
      if (targetFloor) {
        CharUtils.spawnMobXy($gameMap.mapId(), targetFloor.x, targetFloor.y);
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
    this.weight = 1;
  }

  Scroll_ScareMonster.prototype.onRead = function(user, identifyObject) {
    if (user == $gamePlayer) {
      let msg = Message.display('scrollScareMonsterRead');
      LogUtils.addLog(msg);
      let seeMonsterScared = false;
      for (let id in $gameMap._events) {
        let evt = $gameMap._events[id];
        if (evt && evt.type == 'MOB' && MapUtils.getDistance(evt._x, evt._y, $gamePlayer._x, $gamePlayer._y) <= 10) {
          evt.mob.status.afraidEffect.turns = SkillUtils.getDebuffEffectCount(user, 10);
          TimeUtils.eventScheduler.addStatusEffect(evt, 'afraidEffect');
          if (MapDataUtils.getVisible($gameVariables[$gameMap._mapId].mapData[evt._x][evt._y])) {
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
    let result = ($gameParty.hasSoul(Soul_Chick) ? value * 1.05 : value);
    // check difficulty effect
    switch ($gameVariables[0].difficulty) {
      case 'EASY':
        result *= 1.4;
        break;
      case 'HARD': case 'EXTREME':
        result *= 0.8;
        break;
    }
    return result;
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
    this.name = '衝鋒';
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
  // Soul_Barrier

  Soul_Barrier = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Barrier.prototype = Object.create(ItemTemplate.prototype);
  Soul_Barrier.prototype.constructor = Soul_Barrier;

  Soul_Barrier.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '光盾';
    this.description = '你的身體散發出溫暖的光芒';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Roar

  Soul_Roar = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Roar.prototype = Object.create(ItemTemplate.prototype);
  Soul_Roar.prototype.constructor = Soul_Roar;

  Soul_Roar.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '戰吼';
    this.description = '你的吼叫聲令人鬥志高昂';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Tough

  Soul_Tough = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Tough.prototype = Object.create(ItemTemplate.prototype);
  Soul_Tough.prototype.constructor = Soul_Tough;

  Soul_Tough.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '堅韌';
    this.description = '你的身體變得強韌';
  }

  //-----------------------------------------------------------------------------------
  // Soul_RockMissile

  Soul_RockMissile = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_RockMissile.prototype = Object.create(ItemTemplate.prototype);
  Soul_RockMissile.prototype.constructor = Soul_RockMissile;

  Soul_RockMissile.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '飛岩';
    this.description = '你學會操縱大地元素';
  }

  //-----------------------------------------------------------------------------------
  // Soul_RockPierce

  Soul_RockPierce = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_RockPierce.prototype = Object.create(ItemTemplate.prototype);
  Soul_RockPierce.prototype.constructor = Soul_RockPierce;

  Soul_RockPierce.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '土龍亂舞';
    this.description = '你能夠驅使大地為你作戰';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Acid

  Soul_Acid = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Acid.prototype = Object.create(ItemTemplate.prototype);
  Soul_Acid.prototype.constructor = Soul_Acid;

  Soul_Acid.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '酸蝕';
    this.description = '你學會如何噴出酸液';
  }

  //-----------------------------------------------------------------------------------
  // Soul_Discharge

  Soul_Discharge = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_Discharge.prototype = Object.create(ItemTemplate.prototype);
  Soul_Discharge.prototype.constructor = Soul_Discharge;

  Soul_Discharge.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '放電';
    this.description = '你的身體開始帶電';
  }

  //-----------------------------------------------------------------------------------
  // Soul_AdaptWater

  Soul_AdaptWater = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_AdaptWater.prototype = Object.create(ItemTemplate.prototype);
  Soul_AdaptWater.prototype.constructor = Soul_AdaptWater;

  Soul_AdaptWater.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '水性';
    this.description = '你能夠在水中自由行動';
  }

  //-----------------------------------------------------------------------------------
  // Soul_IceBolt

  Soul_IceBolt = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_IceBolt.prototype = Object.create(ItemTemplate.prototype);
  Soul_IceBolt.prototype.constructor = Soul_IceBolt;

  Soul_IceBolt.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '冰箭';
    this.description = '你學會操縱冰之元素';
  }

  //-----------------------------------------------------------------------------------
  // Soul_IceBreath

  Soul_IceBreath = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_IceBreath.prototype = Object.create(ItemTemplate.prototype);
  Soul_IceBreath.prototype.constructor = Soul_IceBreath;

  Soul_IceBreath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '冰之吐息';
    this.description = '你能夠吐出強力的冷氣';
  }

  //-----------------------------------------------------------------------------------
  // Soul_IceBolder

  Soul_IceBolder = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_IceBolder.prototype = Object.create(ItemTemplate.prototype);
  Soul_IceBolder.prototype.constructor = Soul_IceBolder;

  Soul_IceBolder.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '冰岩';
    this.description = '你能夠凝結空氣中的水氣';
  }

  //-----------------------------------------------------------------------------------
  // Soul_AuraFire

  Soul_AuraFire = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_AuraFire.prototype = Object.create(ItemTemplate.prototype);
  Soul_AuraFire.prototype.constructor = Soul_AuraFire;

  Soul_AuraFire.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '火焰光環';
    this.description = '你能夠散發出高熱';
  }

  //-----------------------------------------------------------------------------------
  // Soul_FirePath

  Soul_FirePath = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_FirePath.prototype = Object.create(ItemTemplate.prototype);
  Soul_FirePath.prototype.constructor = Soul_FirePath;

  Soul_FirePath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '火焰路徑';
    this.description = '你的腳下燃起永不熄滅的火焰';
  }

  //-----------------------------------------------------------------------------------
  // Soul_SuperRegen

  Soul_SuperRegen = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_SuperRegen.prototype = Object.create(ItemTemplate.prototype);
  Soul_SuperRegen.prototype.constructor = Soul_SuperRegen;

  Soul_SuperRegen.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '超速再生';
    this.description = '你能在短時間內引出體內強大的生命力';
  }

  //-----------------------------------------------------------------------------------
  // Soul_FireBall

  Soul_FireBall = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_FireBall.prototype = Object.create(ItemTemplate.prototype);
  Soul_FireBall.prototype.constructor = Soul_FireBall;

  Soul_FireBall.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '火球';
    this.description = '你學會操縱火之元素';
  }

  //-----------------------------------------------------------------------------------
  // Soul_FireBreath

  Soul_FireBreath = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_FireBreath.prototype = Object.create(ItemTemplate.prototype);
  Soul_FireBreath.prototype.constructor = Soul_FireBreath;

  Soul_FireBreath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '炎之吐息';
    this.description = '你能夠吐出炙熱的火焰';
  }

  //-----------------------------------------------------------------------------------
  // Soul_AdaptTerrain

  Soul_AdaptTerrain = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_AdaptTerrain.prototype = Object.create(ItemTemplate.prototype);
  Soul_AdaptTerrain.prototype.constructor = Soul_AdaptTerrain;

  Soul_AdaptTerrain.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '適應地形';
    this.description = '你能夠適應各種地形';
  }

  //-----------------------------------------------------------------------------------
  // Soul_OldMemory

  Soul_OldMemory = function() {
    this.initialize.apply(this, arguments);
  }

  Soul_OldMemory.prototype = Object.create(ItemTemplate.prototype);
  Soul_OldMemory.prototype.constructor = Soul_OldMemory;

  Soul_OldMemory.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataItems[8]);
    this.name = '遠古的記憶';
    this.description = '你終於想起來自己是誰';
  }

  //-----------------------------------------------------------------------------------
  // SkillUtils
  //
  // Skill related methods

  SkillUtils = function() {
    throw new Error('This is a static class');
  }
  SkillUtils.weaponSkillList = [];

  SkillUtils.canPerform = function(realSrc, skill) {
    if (realSrc._tp < realSrc.skillTpCost(skill)) {
      if (realSrc == $gameActors.actor(1)) {
        setTimeout(function() {
          MapUtils.displayMessage(Message.display('noEnergy'));
        }, 100);
      }
      return false;
    } else if (realSrc._mp < realSrc.skillMpCost(skill)) {
      if (realSrc == $gameActors.actor(1)) {
        setTimeout(function() {
          MapUtils.displayMessage(Message.display('noMana'));
        }, 100);
      }
      return false;
    }
    return true;
  }

  SkillUtils.gainSkillExp = function(realSrc, skill, lvUpExp, amount) {
    if (realSrc == $gameActors.actor(1)) {
      amount = (amount == undefined) ? 1 : amount;
      skill.exp += Soul_Chick.expAfterAmplify(amount);
      if (lvUpExp != -1 && skill.exp >= lvUpExp) {
        let msg = String.format(Message.display('skillLevelUp'), skill.name)
        TimeUtils.tutorialHandler.msg += msg + '\n';
        LogUtils.addLog(msg);
        skill.lv++;
        skill.exp = 0;
      }
    }
  }

  // for directional skill
  SkillUtils.performDirectionalAction = function(src, x, y) {
    let target = MapUtils.getCharXy(x, y);

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

  SkillUtils.getWarSkillLevelUpExp = function(skillLv) {
    if (skillLv == skillLevelMax) {
      return -1;
    }
    return 25 * skillLv;
  }

  SkillUtils.getMagicSkillLevelUpExp = function(skillLv) {
    if (skillLv == skillLevelMax) {
      return -1;
    }
    return 5 * skillLv;
  }

  SkillUtils.getWeaponSkillLevelUpExp = function(skillLv) {
    if (skillLv == skillLevelMax) {
      return -1;
    }
    return 40 * (skillLv + 1);
  }

  SkillUtils.getDebuffEffectCount = function(target, count) {
    let multiplier = (target.isBoss) ? bossDebuffTurnsMultiplier : 1
    let result = Math.round(count * multiplier);
    result = (result < 1) ? 1 : result;
    return result;
  }

  SkillUtils.getResistance = function(resistanceValue) {
    return (resistanceValue > 1) ? 1 : resistanceValue;
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
    subType:"PASSIVE"
  }

  Skill_MartialArt.prototype.getDamage = function() {
    return this.lv;
  }

  Skill_MartialArt.prototype.knockBackPercentage = function() {
    return this.lv * 8;
  }
  SkillUtils.weaponSkillList.push(Skill_MartialArt);

  //-----------------------------------------------------------------------------------
  // Skill_Scimitar

  Skill_Scimitar = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Scimitar.prototype = Object.create(ItemTemplate.prototype);
  Skill_Scimitar.prototype.constructor = Skill_Scimitar;

  Skill_Scimitar.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '刀術';
    this.description = '使用彎刀戰鬥的技術';
    this.iconIndex = 77;
    this.lv = 0;
    this.exp = 0;
  }

  Skill_Scimitar.prop = {
    type: "SKILL",
    subType:"PASSIVE"
  }

  Skill_Scimitar.prototype.getDamage = function() {
    return this.lv;
  }

  Skill_Scimitar.prototype.bleedingPercentage = function() {
    return this.lv * 8;
  }
  SkillUtils.weaponSkillList.push(Skill_Scimitar);

  //-----------------------------------------------------------------------------------
  // Skill_Spear

  Skill_Spear = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Spear.prototype = Object.create(ItemTemplate.prototype);
  Skill_Spear.prototype.constructor = Skill_Spear;

  Skill_Spear.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '槍術';
    this.description = '使用長柄矛戰鬥的技術';
    this.iconIndex = 77;
    this.lv = 0;
    this.exp = 0;
  }

  Skill_Spear.prop = {
    type: "SKILL",
    subType:"PASSIVE"
  }

  Skill_Spear.prototype.getDamage = function() {
    return this.lv;
  }

  Skill_Spear.prototype.breakArmorPercentage = function() {
    return this.lv * 8;
  }
  SkillUtils.weaponSkillList.push(Skill_Spear);

  //-----------------------------------------------------------------------------------
  // Skill_Staff

  Skill_Staff = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Staff.prototype = Object.create(ItemTemplate.prototype);
  Skill_Staff.prototype.constructor = Skill_Staff;

  Skill_Staff.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '杖法';
    this.description = '使用杖戰鬥與施法的技術';
    this.iconIndex = 77;
    this.lv = 0;
    this.exp = 0;
  }

  Skill_Staff.prop = {
    type: "SKILL",
    subType:"PASSIVE"
  }

  Skill_Staff.prototype.getDamage = function() {
    return Math.ceil(this.lv / 2);
  }

  Skill_Staff.prototype.manaReducedPercentage = function() {
    return this.lv * 3;
  }
  SkillUtils.weaponSkillList.push(Skill_Staff);

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
    subType:"PASSIVE"
  }

  Skill_Throwing.prototype.getDamage = function() {
    return this.lv * 3;
  }
  SkillUtils.weaponSkillList.push(Skill_Throwing);

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
  // Skill_AdaptWater

  Skill_AdaptWater = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_AdaptWater.prototype = Object.create(ItemTemplate.prototype);
  Skill_AdaptWater.prototype.constructor = Skill_AdaptWater;

  Skill_AdaptWater.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '水性';
    this.description = '能夠適應水域的能力';
    this.iconIndex = 77;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_AdaptWater.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 1, levelUp: 50},
      {lv: 2, levelUp: 150},
      {lv: 3, levelUp: -1},
    ]
  }

  //-----------------------------------------------------------------------------------
  // Skill_AdaptTerrain

  Skill_AdaptTerrain = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_AdaptTerrain.prototype = Object.create(ItemTemplate.prototype);
  Skill_AdaptTerrain.prototype.constructor = Skill_AdaptTerrain;

  Skill_AdaptTerrain.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[11]);
    this.name = '適應地形';
    this.description = '地形傷害減半';
    this.iconIndex = 77;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_AdaptTerrain.prop = {
    type: "SKILL",
    subType:"PASSIVE",
    effect: [
      {lv: 1, levelUp: -1}
    ]
  }

  Skill_AdaptTerrain.getTerrainDamageMultiplier = function(realTarget) {
    return (SkillUtils.getSkillInstance(realTarget, Skill_AdaptTerrain)) ? 0.5 : 1;
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
    this.mpCost = 0;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Bite.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE"
  }

  Skill_Bite.bleeding = function(target, realTarget, skillLv) {
    realTarget.status.bleedingEffect.turns += dice(1, 1 + skillLv * 2);
    TimeUtils.eventScheduler.addStatusEffect(target, 'bleedingEffect');
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '出血'));
    LogUtils.addLog(String.format(Message.display('bleeding'), LogUtils.getCharName(realTarget)));
  }

  Skill_Bite.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.lv * 2 + realSrc.param(2) / 3;
      let value = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 12));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes bleeding
      if (Math.random() < this.lv / 15) {
        Skill_Bite.bleeding(target, realTarget, this.lv);
      }
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
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
    this.mpCost = 0;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Bash.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE"
  }

  Skill_Bash.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.lv * 2 + realSrc.param(2) / 3;
      let value = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 1));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes faint
      if (Math.random() < this.lv / 25) {
        realTarget.status.faintEffect.turns += dice(1, 1 + Math.floor(this.lv / 2));
        TimeUtils.eventScheduler.addStatusEffect(target, 'faintEffect');
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '昏迷'));
        LogUtils.addLog(String.format(Message.display('faint'), LogUtils.getCharName(realTarget)));
      }
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
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
    this.mpCost = 0;
    this.tpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Pierce.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MELEE"
  }

  Skill_Pierce.breakArmor = function(target, realTarget, skillLv) {
    realTarget.status.breakArmorEffect.turns += dice(1, 3 + skillLv * 2);
    TimeUtils.eventScheduler.addStatusEffect(target, 'breakArmorEffect');
    TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '破甲'));
    LogUtils.addLog(String.format(Message.display('breakArmor'), LogUtils.getCharName(realTarget)));
  }

  Skill_Pierce.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.lv * 2 + realSrc.param(2) / 3;
      let value = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 11));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes break armor
      if (Math.random() < this.lv / 15) {
        Skill_Pierce.breakArmor(target, realTarget, this.lv);
      }
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
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
    this.mpCost = 0;
    this.tpCost = 40;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Charge.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MELEE"
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

  Skill_Charge.prepareData = function(src, targetX, targetY, moveData, skill) {
    Skill_Charge.data.moveData = moveData;
    Skill_Charge.data.skill = skill;
    if (targetX == src._x) {
      Skill_Charge.data.directionX = 0;
    } else if (targetX > src._x) {
      Skill_Charge.data.directionX = 1;
    } else {
      Skill_Charge.data.directionX = -1;
    }

    if (targetY == src._y) {
      Skill_Charge.data.directionY = 0;
    } else if (targetY > src._y) {
      Skill_Charge.data.directionY = 1;
    } else {
      Skill_Charge.data.directionY = -1;
    }
    Skill_Charge.data.nowDistance = 0;
  }

  Skill_Charge.knockBack = function(target, realTarget, data) {
    // check if target able to be knocked back
    if ((data.moveData.moveFunc == 'moveStraight' && target.canPass(target._x, target._y, data.moveData.param1))
      || (data.moveData.moveFunc == 'moveDiagonally'
      && target.canPassDiagonally(target._x, target._y, data.moveData.param1, data.moveData.param2))) {
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '擊退'));
      target.setPosition(target._x + data.directionX, target._y + data.directionY);
      LogUtils.addLog(String.format(Message.display('bumpKnockBack'), LogUtils.getCharName(realTarget)));
      TrapUtils.checkTrapStepped(target);
      TrapUtils.updateLastTriggered();
    } else {
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '昏迷'));
      realTarget.status.faintEffect.turns++;
      TimeUtils.eventScheduler.addStatusEffect(target, 'faintEffect');
      LogUtils.addLog(String.format(Message.display('bumpKnockFaint'), LogUtils.getCharName(realTarget)));
    }
  }

  Skill_Charge.prototype.action = function(src, x, y) {
    if (src._x == x && src._y == y) {
      MapUtils.displayMessage('你不能向原地發起衝鋒.');
      return false;
    }
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
      , LogUtils.getCharName(realSrc), this.name));
    let moveData = MapUtils.getDisplacementData(src._x, src._y, x, y);
    src.setDirection(moveData.param1);
    AudioManager.playSe({name: "Evasion1", pan: 0, pitch: 100, volume: 100});
    // initialize params
    Skill_Charge.prepareData(src, x, y, moveData, this);

    TimeUtils.actionDone = false;
    let func = function() {
      let data = Skill_Charge.data;
      if (data.nowDistance < data.maxDistance) {
        let checkX = src._x + data.directionX, checkY = src._y + data.directionY;
        if ((data.moveData.moveFunc == 'moveStraight' && src.canPass(src._x, src._y, data.moveData.param1))
          || (data.moveData.moveFunc == 'moveDiagonally'
          && src.canPassDiagonally(src._x, src._y, data.moveData.param1, data.moveData.param2))) {
          // can pass
          src.setPosition(checkX, checkY);
          // TODO: check if terrain effect applied
          // check if terrain effect skill enabled
          let auraEffects = TimeUtils.eventScheduler.getEventQueue().filter(function(evt) {
            return evt.target == src && evt.skillEffect && evt.skillEffect instanceof SkillEffect_Aura;
          });
          for (let id in auraEffects) {
            let auraEvt = auraEffects[id];
            auraEvt.skillEffect.auraEffect();
          }
          // check trap stepped
          TrapUtils.checkTrapStepped(src);
          TrapUtils.updateLastTriggered();
          let status = BattleUtils.getRealTarget(src).status;
          if (status.paralyzeEffect.turns > 0 || status.sleepEffect.turns > 0 || status.faintEffect.turns > 0 || status.groundHoleTrapped) {
            // src unable to move
            data.nowDistance = 100;
          } else {
            data.nowDistance++;
          }
        } else {
          // check if bump into wall
          if (MapDataUtils.getOriginalTile($gameVariables[$gameMap._mapId].mapData[checkX][checkY]) == WALL) {
            let value = dice(1, 10);
            TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 2));
            TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', value * -1));
            LogUtils.addLog(String.format(Message.display('bumpIntoWall'), LogUtils.getCharName(realSrc), value));
            CharUtils.decreaseHp(realSrc, value);
            BattleUtils.checkTargetAlive(realSrc, realSrc, src);
            data.nowDistance = 100;
          }
          // check if bump into target
          let target = MapUtils.getCharXy(checkX, checkY);
          if (target) {
            let realTarget = BattleUtils.getRealTarget(target);
            let atkValue = 6 + data.skill.lv * 2 + realSrc.param(2) / 3;
            let value = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
            TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 2));
            TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
            LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
              , LogUtils.getPerformedTargetName(realSrc, realTarget), data.skill.name, value));
            CharUtils.decreaseHp(realTarget, value);
            // check if causes knock back
            if (Math.random() < data.skill.lv / 15) {
              Skill_Charge.knockBack(target, realTarget, data);
            }
            SkillUtils.gainSkillExp(realSrc, data.skill, SkillUtils.getWarSkillLevelUpExp(data.skill.lv));
            BattleUtils.checkTargetAlive(realSrc, realTarget, target);
            data.nowDistance = 100;
          } else {
            // check if bump into a closed door
            let evts = $gameMap.eventsXy(checkX, checkY);
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
            // check if bump into a secret door
            if ($gameVariables[$gameMap.mapId()].secretBlocks[MapUtils.getTileIndex(checkX, checkY)]
            && !$gameVariables[$gameMap.mapId()].secretBlocks[MapUtils.getTileIndex(checkX, checkY)].isRevealed
            && MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[checkX][checkY]) == DOOR) {
              // secret door discovered
              $gameVariables[$gameMap.mapId()].secretBlocks[MapUtils.getTileIndex(checkX, checkY)].isRevealed = true;
              MapUtils.updateAdjacentTiles(checkX, checkY);
              let target = new Game_Door(checkX, checkY);
              LogUtils.addLog(Message.display('secretDoorDiscovered'));
              // bump into a closed door
              TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 2));
              $gameSelfSwitches.setValue([$gameMap.mapId(), target._eventId, 'A'], true);
              LogUtils.addLog(String.format(Message.display('bumpIntoDoor'), LogUtils.getCharName(realSrc)));
              target.status = 2;
              data.nowDistance++;
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

  Skill_Charge.prototype.getDistance = function() {
    return 3;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Acid

  Skill_Acid = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Acid.prototype = Object.create(ItemTemplate.prototype);
  Skill_Acid.prototype.constructor = Skill_Acid;

  Skill_Acid.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '酸蝕';
    this.description = '對一名敵人噴出酸液, 機率損傷護甲';
    this.iconIndex = 2;
    this.mpCost = 10;
    this.tpCost = 0;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Acid.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MAGIC"
  }

  Skill_Acid.damageEquip = function(target, realTarget) {
    let damaged = false;
    if (realTarget == $gameActors.actor(1)) {
      let equips = realTarget.equips().filter(function(item) {
        return item != null;
      })
      if (equips.length > 0) {
        let toDamage = equips[getRandomInt(equips.length)];
        LogUtils.addLog(String.format(Message.display('equipAcidDamage')
          , LogUtils.getCharName(realTarget), toDamage.name));
        ItemUtils.enchantEquip(toDamage, -1);
        damaged = true;
      }
    } else {
      // 70% damage armor, 30% damage weapon
      if (getRandomInt(10) < 7 && realTarget._xparams[0] > 0) {
        realTarget._xparams[0]--;
        LogUtils.addLog(String.format(Message.display('mobArmorAcidDamage')
          , LogUtils.getCharName(realTarget)));
        damaged = true;
      } else if (realTarget._xparams[2] != 0) {
        realTarget._xparams[2] = ItemUtils.enchantWeaponValue(realTarget._xparams[2], -1);
        LogUtils.addLog(String.format(Message.display('mobWeaponAcidDamage')
          , LogUtils.getCharName(realTarget)));
        damaged = true;
      }
    }
    if (damaged && CharUtils.playerCanSeeChar(target)) {
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '酸蝕'));
    }
  }

  Skill_Acid.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.lv * 2 + realSrc.param(4) / 3;
      let value = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      if (realTarget.status.resistance.state.acid > 0) {
        value = Math.round(value / 2);
      }
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 39));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes bleeding
      if (Math.random() < (0.2 + this.lv / 2) && realTarget.status.resistance.state.acid == 0) {
        // damage armor/weapon
        Skill_Acid.damageEquip(target, realTarget);
      }
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    } else {
      LogUtils.addLog(String.format(Message.display('attackAir'), LogUtils.getCharName(realSrc)
        , this.name));
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Discharge

  Skill_Discharge = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Discharge.prototype = Object.create(ItemTemplate.prototype);
  Skill_Discharge.prototype.constructor = Skill_Discharge;

  Skill_Discharge.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '放電';
    this.description = '對一名敵人釋放電擊, 機率麻痺';
    this.iconIndex = 67;
    this.mpCost = 10;
    this.tpCost = 0;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Discharge.prop = {
    type: "SKILL",
    subType: "DIRECTIONAL",
    damageType: "MAGIC"
  }

  Skill_Discharge.prototype.action = function(src, target) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.lv * 2 + realSrc.param(4) / 3;
      let value = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      value = Math.round(value * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.cold)));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 77));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      // check if causes paralysis
      if (Math.random() < 0.2 + this.lv / 50) {
        if (realTarget.status.resistance.state.paralyze == 0) {
          realTarget.status.paralyzeEffect.turns += dice(1, 3 + Math.floor(this.lv / 2));
          TimeUtils.eventScheduler.addStatusEffect(target, 'paralyzeEffect');
          TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', '麻痺'));
          LogUtils.addLog(String.format(Message.display('paralyze'), LogUtils.getCharName(realTarget)));
        } else {
          LogUtils.addLog(String.format(Message.display('paralyzeResisted'), LogUtils.getCharName(realTarget)));
        }
      }
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    } else {
      LogUtils.addLog(String.format(Message.display('attackAir'), LogUtils.getCharName(realSrc)
        , this.name));
    }
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
    subType: "RANGE"
  }

  Skill_Clever.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Clever);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(10 + this.lv + realSrc.param(4) * this.lv / 20);
    realSrc._buffs[4] += buffAmount;
    let newEffect = new SkillEffect_Clever(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
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
    subType: "RANGE"
  }

  Skill_Scud.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Scud);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 51));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(10 + this.lv + realSrc.param(6) * this.lv / 20);
    realSrc._buffs[6] += buffAmount;
    let newEffect = new SkillEffect_Scud(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
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
    subType: "RANGE"
  }

  Skill_Shield.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Shield);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 53));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(10 + this.lv + realSrc.param(4) * this.lv / 20);
    let newEffect = new SkillEffect_Shield(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Barrier

  Skill_Barrier = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Barrier.prototype = Object.create(ItemTemplate.prototype);
  Skill_Barrier.prototype.constructor = Skill_Barrier;

  Skill_Barrier.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '光盾';
    this.description = '暫時魔法抗性提升';
    this.iconIndex = 81;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Barrier.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_Barrier.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Barrier);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 120));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(10 + this.lv + realSrc.param(4) * this.lv / 20);
    let newEffect = new SkillEffect_Barrier(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Roar

  Skill_Roar = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Roar.prototype = Object.create(ItemTemplate.prototype);
  Skill_Roar.prototype.constructor = Skill_Roar;

  Skill_Roar.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '戰吼';
    this.description = '暫時力量提升';
    this.iconIndex = 64;
    this.tpCost = 30;
    this.mpCost = 0;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Roar.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_Roar.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Roar);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 37));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(5 + this.lv + realSrc.param(2) * this.lv / 20);
    realSrc._buffs[2] += buffAmount;
    let newEffect = new SkillEffect_Roar(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Tough

  Skill_Tough = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Tough.prototype = Object.create(ItemTemplate.prototype);
  Skill_Tough.prototype.constructor = Skill_Tough;

  Skill_Tough.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[12]);
    this.name = '堅韌';
    this.description = '暫時體格提升';
    this.iconIndex = 68;
    this.tpCost = 30;
    this.mpCost = 0;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_Tough.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_Tough.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Tough);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 52));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let buffAmount = Math.round(5 + this.lv + realSrc.param(3) * this.lv / 20);
    realSrc._buffs[3] += buffAmount;
    let newEffect = new SkillEffect_Tough(realSrc, this, 15 + this.lv * 5, buffAmount);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
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
    this.mpCost = 0;
    this.tpCost = 50;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Hide.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_Hide.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (CharUtils.playerCanSeeChar(src)) {
      if (src == $gamePlayer) {
        $gamePlayer.setOpacity(64);
      }
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 35));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let invisibleTurns = 4 + this.lv;
    if (realSrc.status.invisibleEffect.turns < invisibleTurns) {
      realSrc.status.invisibleEffect.turns = invisibleTurns;
      TimeUtils.eventScheduler.addStatusEffect(src, 'invisibleEffect');
    }
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getWarSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_SuperRegen

  Skill_SuperRegen = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_SuperRegen.prototype = Object.create(ItemTemplate.prototype);
  Skill_SuperRegen.prototype.constructor = Skill_SuperRegen;

  Skill_SuperRegen.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '超速再生';
    this.description = '一段時間內迅速回復生命力，但會迅速降低飽食度';
    this.iconIndex = 64;
    this.mpCost = 6;
    this.lv = 1;
    this.exp = 0;
    // buff or debuf
    this.isBuff = true;
  }

  Skill_SuperRegen.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_SuperRegen.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_SuperRegen);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 52));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let newEffect = new SkillEffect_SuperRegen(realSrc, this, 8 + this.lv * 2);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_AuraFire

  Skill_AuraFire = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_AuraFire.prototype = Object.create(ItemTemplate.prototype);
  Skill_AuraFire.prototype.constructor = Skill_AuraFire;

  Skill_AuraFire.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '火焰光環';
    this.description = '持續對身旁的敵人造成火焰傷害';
    this.iconIndex = 72;
    this.mpCost = 2;
    this.tpCost = 0;
    this.lv = 1;
    this.exp = 0;

    this.isAura = true;
  }

  Skill_AuraFire.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_AuraFire.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    let effect = CharUtils.getTargetEffect(realSrc, Skill_AuraFire);
    if (effect) {
      AudioManager.playSe({name: "Down2", pan: 0, pitch: 100, volume: 100});
      LogUtils.addLog(String.format(Message.display('auraDisabled')
        , LogUtils.getCharName(realSrc), this.name));
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    } else {
      if (CharUtils.playerCanSeeChar(src)) {
        TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 52));
        TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
        LogUtils.addLog(String.format(Message.display('auraEnabled')
          , LogUtils.getCharName(realSrc), this.name));
      }
      let newEffect = new SkillEffect_AuraFire(realSrc, this);
      realSrc.status.skillEffect.push(newEffect);
      TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    }
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_FirePath

  Skill_FirePath = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_FirePath.prototype = Object.create(ItemTemplate.prototype);
  Skill_FirePath.prototype.constructor = Skill_FirePath;

  Skill_FirePath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '火焰路徑';
    this.description = '在行進路線上留下燃燒的火焰';
    this.iconIndex = 64;
    this.mpCost = 1;
    this.tpCost = 0;
    this.lv = 1;
    this.exp = 0;

    this.isAura = true;
  }

  Skill_FirePath.prop = {
    type: "SKILL",
    subType: "RANGE"
  }

  Skill_FirePath.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    let effect = CharUtils.getTargetEffect(realSrc, Skill_FirePath);
    if (effect) {
      AudioManager.playSe({name: "Down2", pan: 0, pitch: 100, volume: 100});
      LogUtils.addLog(String.format(Message.display('firePathDisabled')
        , LogUtils.getCharName(realSrc)));
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    } else {
      if (CharUtils.playerCanSeeChar(src)) {
        TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 67));
        TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
        LogUtils.addLog(String.format(Message.display('firePathEnabled')
          , LogUtils.getCharName(realSrc)));
      }
      let newEffect = new SkillEffect_FirePath(realSrc, this);
      realSrc.status.skillEffect.push(newEffect);
      TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
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
  // Skill_RockMissile

  Skill_RockMissile = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_RockMissile.prototype = Object.create(ItemTemplate.prototype);
  Skill_RockMissile.prototype.constructor = Skill_RockMissile;

  Skill_RockMissile.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '飛岩';
    this.description = '直線射出一顆岩石, 物理傷害';
    this.iconIndex = 68;
    this.mpCost = 8;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_RockMissile.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MELEE"
  }

  Skill_RockMissile.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.skill.lv + realSrc.param(4) / 3;
      let damage = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 86));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('Collections3', 7, 0, 2);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_SingleTarget(src, x, y, data);
    return true;
  }

  Skill_RockMissile.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_RockPierce

  Skill_RockPierce = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_RockPierce.prototype = Object.create(ItemTemplate.prototype);
  Skill_RockPierce.prototype.constructor = Skill_RockPierce;

  Skill_RockPierce.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '土龍翻滾';
    this.description = '直線從大地升起石柱, 物理貫穿傷害';
    this.iconIndex = 68;
    this.mpCost = 16;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_RockPierce.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MELEE"
  }

  Skill_RockPierce.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 8 + this.skill.lv * 2 + realSrc.param(4) / 3;
      let damage = BattleUtils.calcPhysicalDamage(realSrc, realTarget, atkValue);
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 86));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('Collections3', 6, 1, 2);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_Ray(src, x, y, data);
    return true;
  }

  Skill_RockPierce.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_FireBall

  Skill_FireBall = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_FireBall.prototype = Object.create(ItemTemplate.prototype);
  Skill_FireBall.prototype.constructor = Skill_FireBall;

  Skill_FireBall.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '火球';
    this.description = '直線射出一顆火球, 魔法傷害';
    this.iconIndex = 64;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_FireBall.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_FireBall.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);

      let atkValue = 4 + this.skill.lv + realSrc.param(4) / 3;
      let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      damage = Math.round(damage * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.fire)));
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 67));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('!Flame', 4, 1, 2);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_SingleTarget(src, x, y, data);
    return true;
  }

  Skill_FireBall.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_FireBreath

  Skill_FireBreath = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_FireBreath.prototype = Object.create(ItemTemplate.prototype);
  Skill_FireBreath.prototype.constructor = Skill_FireBreath;

  Skill_FireBreath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '火焰吐息';
    this.description = '直線吐出灼熱的火焰, 魔法貫穿傷害';
    this.iconIndex = 64;
    this.mpCost = 20;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_FireBreath.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_FireBreath.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 8 + this.skill.lv * 2 + realSrc.param(4) / 3;
      let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      damage = Math.round(damage * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.fire)));
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 67));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('Collections3', 4, 2, 2);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_Ray(src, x, y, data);
    return true;
  }

  Skill_FireBreath.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_IceBolt

  Skill_IceBolt = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_IceBolt.prototype = Object.create(ItemTemplate.prototype);
  Skill_IceBolt.prototype.constructor = Skill_IceBolt;

  Skill_IceBolt.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '冰箭';
    this.description = '直線射出一根冰箭, 魔法傷害';
    this.iconIndex = 67;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_IceBolt.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_IceBolt.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 4 + this.skill.lv + realSrc.param(4) / 3;
      let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      damage = Math.round(damage * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.cold)));
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 71));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('Collections3', 6, 2, 8);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_SingleTarget(src, x, y, data);
    return true;
  }

  Skill_IceBolt.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_IceBreath

  Skill_IceBreath = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_IceBreath.prototype = Object.create(ItemTemplate.prototype);
  Skill_IceBreath.prototype.constructor = Skill_IceBreath;

  Skill_IceBreath.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '冰之吐息';
    this.description = '直線吐出冰之氣息, 魔法貫穿傷害';
    this.iconIndex = 67;
    this.mpCost = 20;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_IceBreath.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_IceBreath.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 8 + this.skill.lv * 2 + realSrc.param(4) / 3;
      let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      damage = Math.round(damage * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.cold)));
      CharUtils.decreaseHp(realTarget, damage);
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 71));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('Collections3', 7, 0, 8);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_Ray(src, x, y, data);
    return true;
  }

  Skill_IceBreath.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_IceBolder

  Skill_IceBolder = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_IceBolder.prototype = Object.create(ItemTemplate.prototype);
  Skill_IceBolder.prototype.constructor = Skill_IceBolder;

  Skill_IceBolder.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '冰岩';
    this.description = '召喚冰岩, 對敵人造成魔法傷害, 亦可作為障礙物';
    this.iconIndex = 67;
    this.mpCost = 30;
    this.tpCost = 0;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_IceBolder.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_IceBolder.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // check if cast on wall or closed door
    let doorEvt = $gameMap.eventsXy(x, y).filter(function(evt) {
      return evt.type == 'DOOR';
    })[0];
    let mapId = $gameMap.mapId();
    if (!MapUtils.isTilePassable(mapId, x, y, MapDataUtils.getOriginalTile($gameVariables[mapId].mapData[x][y]))
      || (doorEvt && doorEvt.status == 1)) {
      MapUtils.addBothLog(Message.display('scrollReadNoEffect'));
      return true;
    }

    LogUtils.addLog(String.format(Message.display('objectSummoned'), LogUtils.getCharName(realSrc), this.name));
    let bolder = new IceBolder(x, y);
    AudioManager.playSe({name: "Earth3", pan: 0, pitch: 100, volume: 100});
    TimeUtils.eventScheduler.insertEvent(new ScheduleEvent(bolder
      , $gameVariables[0].gameTime + 160 + this.lv * 40));

    let target = MapUtils.getCharXy(x, y);
    if (target) {
      let realTarget = BattleUtils.getRealTarget(target);
      let atkValue = 15 + this.lv * 5 + realSrc.param(4) / 3;
      let value = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      value = Math.round(value * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.cold)));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 4));
      TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', value * -1));
      LogUtils.addLog(String.format(Message.display('damageSkillPerformed'), LogUtils.getCharName(realSrc)
        , LogUtils.getPerformedTargetName(realSrc, realTarget), this.name, value));
      CharUtils.decreaseHp(realTarget, value);
      SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
    }
    // deal with tile/trap change
    bolder.checkTerrainEffect();
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_DarkFireBall

  Skill_DarkFireBall = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_DarkFireBall.prototype = Object.create(ItemTemplate.prototype);
  Skill_DarkFireBall.prototype.constructor = Skill_DarkFireBall;

  Skill_DarkFireBall.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '闇炎彈';
    this.description = '直線射出一顆闇火球, 擴散魔法傷害';
    this.iconIndex = 64;
    this.mpCost = 10;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_DarkFireBall.prop = {
    type: "SKILL",
    subType: "PROJECTILE",
    damageType: "MAGIC"
  }

  Skill_DarkFireBall.prototype.action = function(src, x, y) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    // parent of this function would be ProjectileData
    let hitCharFunc = function(vm, target) {
      let realSrc = BattleUtils.getRealTarget(vm.src);
      let realTarget = BattleUtils.getRealTarget(target);

      let atkValue = 4 + this.skill.lv + realSrc.param(4) / 3;
      let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
      CharUtils.decreaseHp(realTarget, damage);
      // dark fire area generated
      for (let i = target._x - 1; i <= target._x + 1; i++) {
        for (let j = target._y - 1; j <= target._y + 1; j++) {
          if (i < 0 || i >= $gameMap.width() || j < 0 || j >= $gameMap.height()) {
            continue;
          }
          let tile = MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[i][j]);
          if (tile == FLOOR && MapUtils.isTilePassable($gameMap.mapId(), i, j, tile)) {
            Terrain_DarkFire.generate(i, j);
          }
        }
      }
      if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
        TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 121));
        TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
        LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
          , this.skill.name, LogUtils.getCharName(realTarget), damage));
      }
      BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      SkillUtils.gainSkillExp(realSrc, this.skill, SkillUtils.getMagicSkillLevelUpExp(this.skill.lv));
    }
    if (CharUtils.playerCanSeeBlock(src._x, src._y)) {
      LogUtils.addLog(String.format(Message.display('shootProjectile'), LogUtils.getCharName(realSrc), this.name));
    }
    let imageData = new ImageData('!Flame2', 4, 1, 2);
    let data = new ProjectileData(this, imageData, this.getDistance(), hitCharFunc);
    new Projectile_SingleTarget(src, x, y, data);
    return true;
  }

  Skill_DarkFireBall.prototype.getDistance = function() {
    return 5 + Math.floor(this.lv / 2);
  }

  //-----------------------------------------------------------------------------------
  // Skill_DarkFireBlast

  Skill_DarkFireBlast = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_DarkFireBlast.prototype = Object.create(ItemTemplate.prototype);
  Skill_DarkFireBlast.prototype.constructor = Skill_DarkFireBlast;

  Skill_DarkFireBlast.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '闇炎爆';
    this.description = '周身闇炎大爆發, 魔法傷害';
    this.iconIndex = 64;
    this.mpCost = 20;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_DarkFireBlast.prop = {
    type: "SKILL",
    subType: "RANGE",
    damageType: "MAGIC"
  }

  Skill_DarkFireBlast.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 107));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }
    let atkValue = 8 + this.lv * 2 + realSrc.param(4) / 3;
    // search area
    for (let i = src._x - 2; i <= src._x + 2; i++) {
      for (let j = src._y - 2; j <= src._y + 2; j++) {
        if (i < 0 || i >= $gameMap.width() || j < 0 || j >= $gameMap.height()) {
          continue;
        }
        // check characters
        let target = MapUtils.getCharXy(i, j);
        if (target && target != src) {
          let realTarget = BattleUtils.getRealTarget(target);
          let damage = BattleUtils.calcMagicDamage(realSrc, realTarget, atkValue);
          CharUtils.decreaseHp(realTarget, damage);
          if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
            TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 121));
            TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
            LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
              , this.name, LogUtils.getCharName(realTarget), damage));
          }
          BattleUtils.checkTargetAlive(realSrc, realTarget, target);
        }
        let tile = MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[i][j]);
        if (tile == FLOOR && MapUtils.isTilePassable($gameMap.mapId(), i, j, tile)) {
          Terrain_DarkFire.generate(i, j);
        }
      }
    }
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------------
  // Skill_Judgement

  Skill_Judgement = function() {
    this.initialize.apply(this, arguments);
  }

  Skill_Judgement.prototype = Object.create(ItemTemplate.prototype);
  Skill_Judgement.prototype.constructor = Skill_Judgement;

  Skill_Judgement.prototype.initialize = function () {
    ItemTemplate.prototype.initialize.call(this, $dataSkills[13]);
    this.name = '審判';
    this.description = '全地圖魔法傷害, 終結一切';
    this.iconIndex = 64;
    this.mpCost = 40;
    this.lv = 1;
    this.exp = 0;
  }

  Skill_Judgement.prop = {
    type: "SKILL",
    subType: "RANGE",
    damageType: "MAGIC"
  }

  Skill_Judgement.prototype.action = function(src) {
    let realSrc = BattleUtils.getRealTarget(src);
    realSrc.paySkillCost(this);

    let effect = CharUtils.getTargetEffect(realSrc, Skill_Judgement);
    if (effect) {
      effect.effectEnd();
      let index = realSrc.status.skillEffect.indexOf(effect);
      realSrc.status.skillEffect.splice(index, 1);
      TimeUtils.eventScheduler.removeEvent(src, effect);
    }
    if (CharUtils.playerCanSeeChar(src)) {
      TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 52));
      TimeUtils.animeQueue.push(new AnimeObject(src, 'POP_UP', this.name));
      LogUtils.addLog(String.format(Message.display('nonDamageSkillPerformed')
        , LogUtils.getCharName(realSrc), this.name));
    }

    let newEffect = new SkillEffect_Judgement(realSrc, this, 5, 0);
    realSrc.status.skillEffect.push(newEffect);
    TimeUtils.eventScheduler.addSkillEffect(src, newEffect);
    SkillUtils.gainSkillExp(realSrc, this, SkillUtils.getMagicSkillLevelUpExp(this.lv));
    return true;
  }

  //-----------------------------------------------------------------------------
  // Game_SkillEffect
  //
  // The game object class for skill effect

  Game_SkillEffect = function() {
    this.initialize.apply(this, arguments);
  }

  Game_SkillEffect.prototype = Object.create(Object.prototype);
  Game_SkillEffect.prototype.constructor = Game_SkillEffect;

  Game_SkillEffect.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    this.realSrc = realSrc;
    this.skill = skill;
    this.effectCount = effectCount;
    this.amount = amount;
  }

  Game_SkillEffect.prototype.effectEnd = function() {
    // defined by each skill effect
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Barrier
  //
  // The game object class for skill: Barrier

  SkillEffect_Barrier = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Barrier.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Barrier.prototype.constructor = SkillEffect_Barrier;

  SkillEffect_Barrier.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Shield
  //
  // The game object class for skill: Shield

  SkillEffect_Shield = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Shield.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Shield.prototype.constructor = SkillEffect_Shield;

  SkillEffect_Shield.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Clever
  //
  // The game object class for skill: Clever

  SkillEffect_Clever = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Clever.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Clever.prototype.constructor = SkillEffect_Clever;

  SkillEffect_Clever.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  SkillEffect_Clever.prototype.effectEnd = function() {
    this.realSrc._buffs[4] -= this.amount;
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Scud
  //
  // The game object class for skill: Scud

  SkillEffect_Scud = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Scud.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Scud.prototype.constructor = SkillEffect_Scud;

  SkillEffect_Scud.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  SkillEffect_Scud.prototype.effectEnd = function() {
    this.realSrc._buffs[6] -= this.amount;
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Roar
  //
  // The game object class for skill: Roar

  SkillEffect_Roar = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Roar.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Roar.prototype.constructor = SkillEffect_Roar;

  SkillEffect_Roar.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  SkillEffect_Roar.prototype.effectEnd = function() {
    this.realSrc._buffs[2] -= this.amount;
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Tough
  //
  // The game object class for skill: Tough

  SkillEffect_Tough = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Tough.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Tough.prototype.constructor = SkillEffect_Tough;

  SkillEffect_Tough.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  SkillEffect_Tough.prototype.effectEnd = function() {
    this.realSrc._buffs[3] -= this.amount;
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Judgement
  //
  // The game object class for skill: Judgement

  SkillEffect_Judgement = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Judgement.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Judgement.prototype.constructor = SkillEffect_Judgement;

  SkillEffect_Judgement.prototype.initialize = function(realSrc, skill, effectCount, amount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, amount);
  }

  SkillEffect_Judgement.prototype.effectEnd = function() {
    // perform Judgement
    let src = BattleUtils.getEventFromCharacter(this.realSrc);
    let realSrc = this.realSrc;
    TimeUtils.animeQueue.push(new AnimeObject(src, 'ANIME', 109));
    // search characters
    let charEvts = $gameMap.events().filter(function(evt) {
      return evt.type == 'MOB';
    });
    if (src != $gamePlayer) {
      charEvts.push($gamePlayer);
    }
    let mapData = $gameVariables[$gameMap.mapId()].mapData;
    for (let id in charEvts) {
      let target = charEvts[id];
      if (target != src && MapUtils.checkVisible(src, 100, target._x, target._y, mapData)) {
        let realTarget = BattleUtils.getRealTarget(target);
        let damage = 150;
        CharUtils.decreaseHp(realTarget, damage);
        if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
          TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 121));
          TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
          LogUtils.addLog(String.format(Message.display('projectileAttack'), LogUtils.getCharName(realSrc)
            , this.skill.name, LogUtils.getCharName(realTarget), damage));
        }
        BattleUtils.checkTargetAlive(realSrc, realTarget, target);
      }
    }
    // search obstacles
    let obstacles = $gameMap.events().filter(function(evt) {
      return evt.type == 'BOLDER';
    });
    for (let id in obstacles) {
      let obj = obstacles[id];
      if (obj instanceof IceBolder) {
        IceBolder.melt(obj);
        TimeUtils.eventScheduler.removeEvent(obj);
      }
    }
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_SuperRegen
  //
  // The game object class for skill: SuperRegen

  SkillEffect_SuperRegen = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_SuperRegen.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_SuperRegen.prototype.constructor = SkillEffect_SuperRegen;

  SkillEffect_SuperRegen.prototype.initialize = function(realSrc, skill, effectCount) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, effectCount, null);
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_Aura
  //
  // The game object template class for aura skills

  SkillEffect_Aura = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_Aura.prototype = Object.create(Game_SkillEffect.prototype);
  SkillEffect_Aura.prototype.constructor = SkillEffect_Aura;

  SkillEffect_Aura.prototype.initialize = function(realSrc, skill, eventClassName) {
    Game_SkillEffect.prototype.initialize.call(this, realSrc, skill, 10, 0);
    this.eventClassName = eventClassName;
  }

  SkillEffect_Aura.prototype.effectEnd = function() {
    let src = BattleUtils.getEventFromCharacter(this.realSrc);
    let evts = $gameMap.eventsXy(src._x, src._y).filter(function(evt) {
      return evt.type == 'AURA';
    });
    evts[0].setPosition(-10, -10);
    $gameMap._events[evts[0]._eventId] = null;
    $dataMap.events[evts[0]._eventId] = null;
  }

  SkillEffect_Aura.prototype.auraEffect = function() {
    // implement by auras
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_AuraFire
  //
  // The game object class for skill: AuraFire

  SkillEffect_AuraFire = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_AuraFire.prototype = Object.create(SkillEffect_Aura.prototype);
  SkillEffect_AuraFire.prototype.constructor = SkillEffect_AuraFire;

  SkillEffect_AuraFire.prototype.initialize = function(realSrc, skill) {
    SkillEffect_Aura.prototype.initialize.call(this, realSrc, skill, 'Aura_Fire');
  }

  SkillEffect_AuraFire.prototype.auraEffect = function() {
    let src = BattleUtils.getEventFromCharacter(this.realSrc);
    for (let i = 0; i < 8; i++) {
      let coordinate = MapUtils.getNearbyCoordinate(src._x, src._y, i);
      let target = MapUtils.getCharXy(coordinate.x, coordinate.y);
      let realTarget = (target) ? BattleUtils.getRealTarget(target) : null;
      if (realTarget && realTarget.moveType != 1) { // target not in water
        if (!realTarget.checked) {
          let damage = Math.round(this.skill.lv
            * (1 - SkillUtils.getResistance(realTarget.status.resistance.elemental.fire)));
          CharUtils.decreaseHp(realTarget, damage);
          if (CharUtils.playerCanSeeBlock(target._x, target._y)) {
            TimeUtils.animeQueue.push(new AnimeObject(target, 'ANIME', 67));
            TimeUtils.animeQueue.push(new AnimeObject(target, 'POP_UP', damage * -1));
            LogUtils.addLog(String.format(Message.display('auraDamage'), LogUtils.getCharName(this.realSrc)
              , this.skill.name, LogUtils.getCharName(realTarget), damage));
          }
          BattleUtils.checkTargetAlive(this.realSrc, realTarget, target);
        }
      }
    }
  }

  //-----------------------------------------------------------------------------
  // SkillEffect_FirePath
  //
  // The game object template class for skill: FirePath

  SkillEffect_FirePath = function() {
    this.initialize.apply(this, arguments);
  }

  SkillEffect_FirePath.prototype = Object.create(SkillEffect_Aura.prototype);
  SkillEffect_FirePath.prototype.constructor = SkillEffect_FirePath;

  SkillEffect_FirePath.prototype.initialize = function(realSrc, skill) {
    SkillEffect_Aura.prototype.initialize.call(this, realSrc, skill, null);
  }

  SkillEffect_FirePath.prototype.auraEffect = function() {
    let src = BattleUtils.getEventFromCharacter(this.realSrc);
    // check if floor already burns
    let evts = $gameMap.eventsXy(src._x, src._y).filter(function(event) {
      return event.type == 'TERRAIN';
    })
    if (evts[0]) {
      TimeUtils.eventScheduler.removeEvent(evts[0]);
      evts[0].setPosition(-10, -10);
      $gameMap._events[evts[0]._eventId] = null;
      $dataMap.events[evts[0]._eventId] = null;
      MapUtils.refreshMap();
    }
    // fire can not burn under water
    if (MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[src._x][src._y]) == WATER) {
      return;
    }
    let terrainEvt = new Terrain_Fire(src._x, src._y);
    terrainEvt.evt.damage = this.skill.lv;
    terrainEvt.evt.expire = $gameVariables[0].gameTime + 80 + this.skill.lv * 20;
    terrainEvt.updateDataMap();
    TimeUtils.eventScheduler.insertEvent(new ScheduleEvent(terrainEvt, terrainEvt.evt.expire));
  }

  SkillEffect_FirePath.prototype.effectEnd = function() {
    // do nothing
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
    if (xparamId == 2) {
      return this._xparams[xparamId];
    } else {
      return this._xparams[xparamId] / 100;
    }
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

  Game_Mob.prototype.initialize = function (x, y, fromData) {
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
      // new mob instance from mobId & attributes
      let mobInitData = window[this.constructor.name].mobInitData;
      this.mob = new Game_Enemy(11, x, y, mobInitData.params, mobInitData.xparams);
      this.mob._name = mobInitData.name;
      this.mob.level = mobInitData.level;
      this.mob.moveType = mobInitData.moveType;
      this.mob.fleeAtLowHp = mobInitData.fleeAtLowHp;
      this.mob._tp = 100;
      this.mob.awareDistance = 10;
      this.mob.status = CharUtils.initStatus();
      this.mob._skills = [];
      for (let id in mobInitData.skills) {
        let skillData = mobInitData.skills[id];
        let newSkill = new window[skillData.skillClassName]();
        newSkill.lv = skillData.lv;
        this.mob._skills.push(newSkill);
      }
      this.mob._exp = CharUtils.calcMobExp(this.mob);
      this.mob.moved = false;
      this.mob.attacked = false;
      this.mob.turnCount = 0;
      this.mob.mobClass = this.constructor.name;
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
    // add mob recovery mechanism
    let turnPassed = Math.floor(($gameVariables[0].gameTime - this.mob.lastTimeMoved)
      / CharUtils.getActionTime(this.mob));
    let regenCount = Math.floor(turnPassed / regenTurnCount);
    for (let i = 0; i < regenCount; i++) {
      if (this.mob.hp == this.mob.mhp && this.mob.mp == this.mob.mmp && this.mob.tp == 100) {
        // already full situation, break
        break;
      }
      CharUtils.regenerate(this);
      CharUtils.regenerateTp(this);
    }
    // add event to scheduler
    TimeUtils.eventScheduler.insertEvent(new ScheduleEvent(this, $gameVariables[0].gameTime));
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
        if (this.mob.status.afraidEffect.turns > 0) {
          this.moveAwayFromCharacter($gamePlayer);
        } else if (this.mob.fleeAtLowHp && (this.mob.hp / this.mob.mhp < mobFleeHpPercentage)
          && getRandomInt(100) < 60 && this.moveAwayFromCharacter($gamePlayer)) {
          // successfully flee
        } else if (!CharUtils.canSee(this.mob, $gameActors.actor(1))) {
          // TODO: mob can attack when blind and try to walk into a character
          this.moveRandom();
        } else if (this.mob.status.paralyzeEffect.turns > 0 || this.mob.status.sleepEffect.turns > 0
          || this.mob.status.faintEffect.turns > 0) {
          // do nothing
        } else if (this.performStateAction()) {
          // already done action
        } else if (distance < 2) {
          this.turnTowardCharacter($gamePlayer);
          if (this.targetInSightAction($gamePlayer)) {
            // already done action
          } else if (this.meleeAction($gamePlayer)) {
            // already done action
          } else if (CharUtils.playerCanSeeChar(this)) {
            LogUtils.addLog(String.format(Message.display('attackOutOfEnergy'), LogUtils.getCharName(this.mob)));
          }
        } else if (distance < this.mob.awareDistance) {
          // check remote attack
          if (MapUtils.checkVisible(this, this.mob.awareDistance, $gamePlayer._x, $gamePlayer._y
            , $gameVariables[$gameMap.mapId()].mapData) && this.targetInSightAction($gamePlayer)) {
            // already done action
          } else {
            // check projectile action
            let data = CharUtils.checkTargetReachable(this, $gamePlayer);
            if (data && this.projectileAction(data.directionX, data.directionY, data.distance)) {
              // already done action
            } else {
              // check penetrate action
              let data = CharUtils.checkTargetReachable(this, $gamePlayer, true);
              if (data && this.penetrateAction(data.directionX, data.directionY, data.distance)) {
                // already done action
              } else {
                // find route to player
                let path = MapUtils.findShortestRoute(this, $gamePlayer._x, $gamePlayer._y, mobTraceRouteMaxDistance);
                if (path) {
                  // add this to prevent corner hit-and-wait
                  let keepDistance = window[this.constructor.name].keepDistance;
                  if (!keepDistance || MapUtils.getDistance(MapDataUtils.getX(path[0].mapBlock)
                    , MapDataUtils.getY(path[0].mapBlock), $gamePlayer._x, $gamePlayer._y) > keepDistance) {
                    this.moveTowardPosition(MapDataUtils.getX(path[0].mapBlock), MapDataUtils.getY(path[0].mapBlock));
                  }
                } else {
                  this.moveTowardCharacter($gamePlayer);
                }
              }
            }
          }
        } else {
          // do nothing
        }
      }
    }
    let func = function(vm) {
      if (TimeUtils.actionDone && $dataMap) {
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

  // define projectile action (target in line & direct reachable)
  Game_Mob.prototype.projectileAction = function(x, y, distance) {
    return false;
  }

  // define penetrate action (target in line)
  Game_Mob.prototype.penetrateAction = function(x, y, distance) {
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

  // Override so mobs can move diagonally
  Game_Mob.prototype.moveTowardCharacter = function (character) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var candidate = [], distanceRecord = [];
    var nowDistance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
    for (var i = 0; i < 8; i++) {
      var coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
      if (!MapUtils.isTilePassable($gameMap.mapId(), coordinate.x, coordinate.y
        , MapDataUtils.getOriginalTile(mapData[coordinate.x][coordinate.y]))
        || (MapDataUtils.getOriginalTile(mapData[coordinate.x][coordinate.y]) == LAVA && this.mob.moveType != 2)
        || (MapDataUtils.getOriginalTile(mapData[coordinate.x][coordinate.y]) == HOLLOW && this.mob.moveType != 2)) {
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
        this.mob.moved = true;
        return true;
      }
    }
    return false;
  }

  Game_Mob.prototype.moveAwayFromCharacter = function (character) {
    var mapData = $gameVariables[$gameMap.mapId()].mapData;
    var path = [], explored = [];

    explored.push(new RouteData(mapData[this._x][this._y], 0));
    let steps = 0, maxDisNode = null, maxDistance = 0;
    while (steps < mobTraceRouteMaxDistance) {
      // find all elements fit now steps
      let toExpend = explored.filter(function(routeData) {
        return routeData.weight == steps;
      })
      steps++;
      // explore from point & update weight
      for (let id in toExpend) {
        let node = toExpend[id];
        let nodeX = MapDataUtils.getX(node.mapBlock), nodeY = MapDataUtils.getY(node.mapBlock);
        for (let i = 0; i < 8; i++) {
          let coordinate = MapUtils.getNearbyCoordinate(nodeX, nodeY, i);
          // check if node already exists
          let exists = explored.filter(function(routeData) {
            return MapDataUtils.getX(routeData.mapBlock) == coordinate.x
              && MapDataUtils.getY(routeData.mapBlock) == coordinate.y;
          })
          if (exists[0]) { // block already explored, check & update weight
            exists[0].weight = (steps < exists[0].weight) ? steps : exists[0].weight;
          } else { // block not exists, add to exploredList
            let mapBlock = mapData[coordinate.x][coordinate.y];
            let weight = -1;
            if (MapUtils.isCharacterPassable(this, coordinate.x, coordinate.y)) {
              weight = steps;
            }
            let routeData = new RouteData(mapBlock, weight);
            explored.push(routeData);
            if (weight > maxDistance) {
              maxDistance = weight;
              maxDisNode = routeData;
            }
          }
        }
      }
    }

    // rollback path
    if (maxDistance > 0) {
      path.push(maxDisNode);
      steps = maxDistance;
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
            if (MapUtils.isNearBy(MapDataUtils.getX(node.mapBlock), MapDataUtils.getY(node.mapBlock)
              , MapDataUtils.getX(nodeAfter.mapBlock), MapDataUtils.getY(nodeAfter.mapBlock)) &&
              MapUtils.isNearBy(MapDataUtils.getX(node.mapBlock), MapDataUtils.getY(node.mapBlock)
              , MapDataUtils.getX(nodeBefore.mapBlock), MapDataUtils.getY(nodeBefore.mapBlock))) {
              candidates.push(node);
            }
          }
        }
        path.push(candidates[getRandomInt(candidates.length)]);
      }
      path.reverse();
      this.moveTowardPosition(MapDataUtils.getX(path[0].mapBlock), MapDataUtils.getY(path[0].mapBlock));
      return true;
    }
    return false;
  }

  Game_Mob.prototype.moveInLineWithCharacter = function(character, minDistance) {
    let distance = MapUtils.getDistance(this._x, this._y, character._x, character._y);
    let data = CharUtils.checkTargetReachable(this, character);
    if (distance > minDistance && data) {
      // already meet requirement
      return false;
    }
    let candidate;
    let candidateDistance = 100;
    for (let i = 0; i < 8; i++) {
      let coordinate = MapUtils.getNearbyCoordinate(this._x, this._y, i);
      if (MapUtils.isTilePassable($gameMap.mapId(), coordinate.x, coordinate.y
        , MapDataUtils.getOriginalTile($gameVariables[$gameMap.mapId()].mapData[coordinate.x][coordinate.y]))
        && !MapUtils.getCharXy(coordinate.x, coordinate.y)
        && CharUtils.checkTargetReachable(character, {_x: coordinate.x, _y: coordinate.y})) {
        let distance = MapUtils.getDistance(coordinate.x, coordinate.y, character._x, character._y);
        if (distance > minDistance && distance < candidateDistance) {
          candidateDistance = distance;
          candidate = coordinate;
        }
      }
    }
    if (candidate) {
      this.moveTowardPosition(candidate.x, candidate.y);
      return true;
    }
    return false;
  }

  // Override this so mobs can move diagonally
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

  // mob adds individual lootings, and then call this function
  Game_Mob.prototype.looting = function (lootings) {
    let mobClass = window[this.constructor.name];
    if (mobClass.lootings) {
      for (let i = 0; i < mobClass.lootings.length; i++) {
        let lootData = mobClass.lootings[i];
        if (getRandomInt(100) < lootData.percentage) {
          let itemClass = window[lootData.itemClassName];
          let item = ItemUtils.createItem(itemClass);
          lootings.push(item);
        }
      }
    }

    // drop lootings
    for (var id in lootings) {
      ItemUtils.addItemToItemPile(this.x, this.y, lootings[id]);
    }

    // drop soul
    if (mobClass.soulData) {
      // check difficulty effect
      let multiplier = 1;
      if ($gameVariables[0].difficulty == 'EASY') {
        multiplier = 1.5;
      }
      if (getRandomInt(100) < mobClass.soulData.percentage * multiplier) {
        this.dropSoul(window[mobClass.soulData.soulClassName]);
      }
    }
  }

  Game_Mob.prototype.initAttribute = function() {
    // check difficulty effect
    let delta = 0;
    switch ($gameVariables[0].difficulty) {
      case 'NORMAL': case 'HARD': case 'EXTREME':
        delta = Math.floor($gameVariables[0].exploredLayerCount / 4);
        break;
    }
    Game_Mob.adjustSingleMobAbility(this.mob, delta);
    CharUtils.updateHpMp(this.mob);
    // amplify HP/MP if target is boss
    if (this.isBoss) {
      let multiplier = bossHpMpMultiplier;
      switch ($gameVariables[0].difficulty) {
        case 'HARD': case 'EXTREME':
          multiplier = 2;
          break;
      }
      this.mob._paramPlus[0] = Math.round(this.mob._paramPlus[0] * multiplier);
      this.mob._hp = this.mob.mhp;
      this.mob._paramPlus[1] = Math.round(this.mob._paramPlus[1] * multiplier);
      this.mob._mp = this.mob.mmp;
    }
  }

  // soul related
  Game_Mob.prototype.dropSoul = function(soulClass) {
    let obtained = $gameParty.hasSoul(soulClass);
    if (!obtained) {
      // tutorial: soul
      TimeUtils.tutorialHandler.queue.push("soul");

      let soul = new soulClass();
      $gameParty._items.push(soul);
      Soul_Obtained_Action.learnSkill(soulClass);
      TimeUtils.animeQueue.push(new AnimeObject($gamePlayer, 'ANIME', 58));
      let msg = String.format(Message.display('absorbSoul'), LogUtils.getCharName(this.mob), soul.name);
      LogUtils.addLog(msg);
      TimeUtils.tutorialHandler.msg += msg + '\n';
    }
  }

  Game_Mob.prototype.performStateAction = function() {
    // designed to process state related action, implements by each class
    return false;
  }

  Game_Mob.adjustMobAbility = function(mobClass, targetLevel) {
    let mobInitData = mobClass.mobInitData;
    let delta = targetLevel - mobInitData.level;
    mobInitData.originalLevel = mobInitData.level;
    mobInitData.level = targetLevel;
    if (delta != 0) {
      // deal with attributes except AGI
      for (let i = 2; i <= 5; i++) {
        mobInitData.params[i] += delta;
        mobInitData.params[i] = (mobInitData.params[i] < 0) ? 0 : mobInitData.params[i];
      }
      // deal with AGI
      mobInitData.params[6] += Math.round(delta / 2);
    }
  }

  Game_Mob.adjustSingleMobAbility = function(mob, delta) {
    mob.level += delta;
    for (let i = 2; i <= 6; i++) {
      mob._params[i] += delta;
    }
  }

  //-----------------------------------------------------------------------------------
  // Chick

  Chick = function () {
    this.initialize.apply(this, arguments);
  }

  Chick.prototype = Object.create(Game_Mob.prototype);
  Chick.prototype.constructor = Chick;

  Chick.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Chick', 0);
  }

  Chick.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Chick);

  //-----------------------------------------------------------------------------------
  // Dog

  Dog = function () {
    this.initialize.apply(this, arguments);
  }

  Dog.prototype = Object.create(Game_Mob.prototype);
  Dog.prototype.constructor = Dog;

  Dog.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Nature', 0);
  }

  Dog.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Bite
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Dog.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Dog);

  //-----------------------------------------------------------------------------------
  // Bee

  Bee = function () {
    this.initialize.apply(this, arguments);
  }

  Bee.prototype = Object.create(Game_Mob.prototype);
  Bee.prototype.constructor = Bee;

  Bee.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Fly1', 0);
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
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Bee);

  //-----------------------------------------------------------------------------------
  // Rooster

  Rooster = function () {
    this.initialize.apply(this, arguments);
  }

  Rooster.prototype = Object.create(Game_Mob.prototype);
  Rooster.prototype.constructor = Rooster;

  Rooster.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Nature', 2);
  }

  Rooster.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Rooster);

  //-----------------------------------------------------------------------------------
  // Rat

  Rat = function () {
    this.initialize.apply(this, arguments);
  }

  Rat.prototype = Object.create(Game_Mob.prototype);
  Rat.prototype.constructor = Rat;

  Rat.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Mice', 1);
  }

  Rat.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40 && this.mob.status.invisibleEffect.turns == 0) { // Skill_Hide
      let skill = this.mob._skills[0];
      if (SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this);
        return true;
      }
    }
    return false;
  }

  Rat.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 100, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Rat);

  //-----------------------------------------------------------------------------------
  // Cat

  Cat = function () {
    this.initialize.apply(this, arguments);
  }

  Cat.prototype = Object.create(Game_Mob.prototype);
  Cat.prototype.constructor = Cat;

  Cat.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Nature', 1);
  }

  Cat.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Clever
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Cat.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_FireBall
      let skill = this.mob._skills[1];
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
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
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Cat);

  //-----------------------------------------------------------------------------------
  // Boar

  Boar = function () {
    this.initialize.apply(this, arguments);
  }

  Boar.prototype = Object.create(Game_Mob.prototype);
  Boar.prototype.constructor = Boar;

  Boar.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Boar', 1);
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
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Boar);

  //-----------------------------------------------------------------------------------
  // Earth_Spirit

  Earth_Spirit = function () {
    this.initialize.apply(this, arguments);
  }

  Earth_Spirit.prototype = Object.create(Game_Mob.prototype);
  Earth_Spirit.prototype.constructor = Earth_Spirit;

  Earth_Spirit.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Fairy', 7);
  }

  Earth_Spirit.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Shield
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Earth_Spirit.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_RockMissile
      let skill = this.mob._skills[1];
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Earth_Spirit.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_RockMissile
      return this.mob._skills[1].action(this, target._x, target._y);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Earth_Spirit.prototype.looting = function () {
    var lootings = [];
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Earth_Spirit);

  //-----------------------------------------------------------------------------------
  // Wolf

  Wolf = function () {
    this.initialize.apply(this, arguments);
  }

  Wolf.prototype = Object.create(Game_Mob.prototype);
  Wolf.prototype.constructor = Wolf;

  Wolf.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Animal', 2);
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
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Wolf);

  //-----------------------------------------------------------------------------------
  // Turtle

  Turtle = function () {
    this.initialize.apply(this, arguments);
  }

  Turtle.prototype = Object.create(Game_Mob.prototype);
  Turtle.prototype.constructor = Turtle;

  Turtle.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Animal', 6);
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
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Turtle);

  //-----------------------------------------------------------------------------------
  // Bear

  Bear = function () {
    this.initialize.apply(this, arguments);
  }

  Bear.prototype = Object.create(Game_Mob.prototype);
  Bear.prototype.constructor = Bear;

  Bear.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Bear', 0);
  }

  Bear.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Bash
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Bear.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Bear);

  //-----------------------------------------------------------------------------------
  // Lion

  Lion = function () {
    this.initialize.apply(this, arguments);
  }

  Lion.prototype = Object.create(Game_Mob.prototype);
  Lion.prototype.constructor = Lion;

  Lion.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Lion', 0);
  }

  Lion.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Roar
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Lion.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && this.performBuffIfNotPresent(this.mob._skills[0])) { // Skill_Roar
      return true;
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Lion.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Lion);

  //-----------------------------------------------------------------------------------
  // Buffalo

  Buffalo = function () {
    this.initialize.apply(this, arguments);
  }

  Buffalo.prototype = Object.create(Game_Mob.prototype);
  Buffalo.prototype.constructor = Buffalo;

  Buffalo.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Buffalo', 1);
  }

  Buffalo.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Tough
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Buffalo.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && this.performBuffIfNotPresent(this.mob._skills[0])) { // Skill_Tough
      return true;
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Buffalo.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Buffalo);

  //-----------------------------------------------------------------------------------
  // Earth_Dragon

  Earth_Dragon = function () {
    this.initialize.apply(this, arguments);
  }

  Earth_Dragon.prototype = Object.create(Game_Mob.prototype);
  Earth_Dragon.prototype.constructor = Earth_Dragon;

  Earth_Dragon.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Dragon', 2);
  }

  Earth_Dragon.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Shield
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Earth_Dragon.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      skill = this.mob._skills[2]; // Skill_RockMissile
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Earth_Dragon.prototype.penetrateAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[3]; // Skill_RockPierce
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Earth_Dragon.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_Bash
      return this.mob._skills[1].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Earth_Dragon.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 500, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[0].push(Earth_Dragon);

  //-----------------------------------------------------------------------------------
  // SealKing
  // 
  // Final boss

  SealKing = function () {
    this.initialize.apply(this, arguments);
  }

  SealKing.prototype = Object.create(Game_Mob.prototype);
  SealKing.prototype.constructor = SealKing;

  SealKing.prototype.isBoss = true;

  SealKing.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Evil', 5);
    this.mob.layerFixed = true; // can not change layer
    if (!this.mob.judgementTimeStamp) {
      this.mob.judgementTimeStamp = 0;
    }
  }

  // setup judgement cooldown (10 turns)
  SealKing.coolDown = 130;

  SealKing.prototype.targetInSightAction = function(target) {
    if (!$gameVariables[0].eventState.sealKingEncountered) {
      $gameVariables[0].eventState.sealKingEncountered = true;
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.sealKingEncountered);
    } else if (AudioManager._currentBgm.name != 'Battle3') {
      AudioManager.playBgm({name: 'Battle3', pan: 0, pitch: 100, volume: 100});
    }

    // health below half can cast judgement
    if (this.mob.hp < this.mob.mhp / 2) {
      if (getRandomInt(100) < 80 && $gameVariables[0].gameTime - this.mob.judgementTimeStamp > SealKing.coolDown
        && SkillUtils.canPerform(this.mob, this.mob._skills[4])) {
        if (!$gameVariables[0].eventState.judgementPerformed) {
          $gameVariables[0].eventState.judgementPerformed = true;
          MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.judgementPerformed);
        }
        let performed = this.mob._skills[4].action(this);
        if (performed) {
          this.mob.judgementTimeStamp = $gameVariables[0].gameTime;
        }
        return performed;
      }
    }

    let distance = MapUtils.getDistance(this._x, this._y, target._x, target._y);
    if (distance < 3 && getRandomInt(100) < 40
      && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_DarkFireBlast
      return this.mob._skills[1].action(this);
    }
    return false;
  }

  SealKing.prototype.performStateAction = function() {
    let realSrc = BattleUtils.getRealTarget(this);
    let skillEffect = CharUtils.getTargetEffect(realSrc, Skill_Judgement);
    if (skillEffect) {
      if (skillEffect.effectCount > 1 && CharUtils.playerCanSeeChar(this)) {
        TimeUtils.animeQueue.push(new AnimeObject(this, 'ANIME', 52));
        TimeUtils.animeQueue.push(new AnimeObject(this, 'POP_UP', '蓄力'));
        LogUtils.addLog(String.format(Message.display('charging'), LogUtils.getCharName(realSrc)));
      }
      return true;
    }
  }

  SealKing.prototype.projectileAction = function(x, y, distance) {
    let randNum = getRandomInt(100);
    if (randNum < 50) {
      let skill = this.mob._skills[0]; // Skill_DarkFireBall
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    if (randNum < 60) {
      let skill = this.mob._skills[2]; // Skill_Charge
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  SealKing.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[3])) { // Skill_Bash
      return this.mob._skills[3].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  SealKing.prototype.looting = function () {
    var lootings = [];
    // TODO: implements looting
    Game_Mob.prototype.looting.call(this, lootings);
    setTimeout(() => {
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.sealKingDefeated);
    }, 200);
  }

  //-----------------------------------------------------------------------------------
  // Shark

  Shark = function () {
    this.initialize.apply(this, arguments);
  }

  Shark.prototype = Object.create(Game_Mob.prototype);
  Shark.prototype.constructor = Shark;

  Shark.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Shark', 0);
    this.mob.status.resistance.elemental.fire = 1;
  }

  Shark.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Bite
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Shark.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[1].push(Shark);

  //-----------------------------------------------------------------------------------
  // Slime

  Slime = function () {
    this.initialize.apply(this, arguments);
  }

  Slime.prototype = Object.create(Game_Mob.prototype);
  Slime.prototype.constructor = Slime;

  Slime.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Monster', 1);
    this.mob.status.resistance.elemental.fire = 0.3;
    this.mob.status.resistance.elemental.cold = 0.3;
  }

  Slime.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 20 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Acid
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Slime.prototype.looting = function () {
    var lootings = [];
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[1].push(Slime);

  //-----------------------------------------------------------------------------------
  // Jellyfish

  Jellyfish = function () {
    this.initialize.apply(this, arguments);
  }

  Jellyfish.prototype = Object.create(Game_Mob.prototype);
  Jellyfish.prototype.constructor = Jellyfish;

  Jellyfish.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Jellyfish', 0);
    this.mob.status.resistance.elemental.fire = 1;
  }

  Jellyfish.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 20 && SkillUtils.canPerform(this.mob, this.mob._skills[0])) { // Skill_Acid
      return this.mob._skills[0].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Jellyfish.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 200, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[1].push(Jellyfish);

  //-----------------------------------------------------------------------------------
  // Ice_Spirit

  Ice_Spirit = function () {
    this.initialize.apply(this, arguments);
  }

  Ice_Spirit.prototype = Object.create(Game_Mob.prototype);
  Ice_Spirit.prototype.constructor = Ice_Spirit;

  Ice_Spirit.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Fairy', 2);
    this.mob.status.resistance.elemental.fire = -0.5;
    this.mob.status.resistance.elemental.cold = 1;
  }

  Ice_Spirit.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Ice_Spirit.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_IceBolt
      let skill = this.mob._skills[1];
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Ice_Spirit.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_IceBolt
      return this.mob._skills[1].action(this, target._x, target._y);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Ice_Spirit.prototype.looting = function () {
    var lootings = [];
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[1].push(Ice_Spirit);

  //-----------------------------------------------------------------------------------
  // Ice_Dragon

  Ice_Dragon = function () {
    this.initialize.apply(this, arguments);
  }

  Ice_Dragon.prototype = Object.create(Game_Mob.prototype);
  Ice_Dragon.prototype.constructor = Ice_Dragon;

  Ice_Dragon.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Dragon', 1);
    this.mob.status.resistance.elemental.cold = 1;
  }

  Ice_Dragon.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Ice_Dragon.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      skill = this.mob._skills[2]; // Skill_IceBolt
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Ice_Dragon.prototype.penetrateAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[3]; // Skill_IceBreath
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Ice_Dragon.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_Bash
      return this.mob._skills[1].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Ice_Dragon.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 500, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[1].push(Ice_Dragon);

  //-----------------------------------------------------------------------------------
  // Selina
  // 
  // Ice dungeon boss

  Selina = function () {
    this.initialize.apply(this, arguments);
  }

  Selina.prototype = Object.create(Game_Mob.prototype);
  Selina.prototype.constructor = Selina;

  Selina.prototype.isBoss = true;

  Selina.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Jelly_Maid', 0);
    this.mob.status.resistance.elemental.cold = 1;
    this.mob.status.resistance.elemental.fire = -0.3;
  }

  Selina.prototype.targetInSightAction = function(target) {
    if (!$gameVariables[0].eventState.selinaEncountered) {
      $gameVariables[0].eventState.selinaEncountered = true;
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.selinaEncountered);
    } else if (AudioManager._currentBgm.name != 'Battle2') {
      AudioManager.playBgm({name: 'Battle2', pan: 0, pitch: 100, volume: 100});
    }
    if (getRandomInt(100) < 60) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Selina.prototype.projectileAction = function(x, y, distance) {
    if (this.mob._hp < this.mob.mhp / 2 && getRandomInt(100) < 50 && distance <= 3) {
      if (SkillUtils.canPerform(this.mob, this.mob._skills[3])) { // Skill_IceBolder
        return this.mob._skills[3].action(this, x, y);
      }
    }
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[1]; // Skill_IceBolt
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Selina.prototype.penetrateAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[2]; // Skill_IceBreath
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Selina.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[3])) { // Skill_IceBolder
      return this.mob._skills[3].action(this, target._x, target._y);
    }
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_IceBolt
      return this.mob._skills[1].action(this, target._x, target._y);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Selina.prototype.looting = function () {
    var lootings = [];
    // TODO: implements looting
    Game_Mob.prototype.looting.call(this, lootings);
    setTimeout(() => {
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.selinaDefeated);
    }, 200);
  }

  //-----------------------------------------------------------------------------------
  // Salamander

  Salamander = function () {
    this.initialize.apply(this, arguments);
  }

  Salamander.prototype = Object.create(Game_Mob.prototype);
  Salamander.prototype.constructor = Salamander;

  Salamander.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Salamander', 1);
    this.mob.status.resistance.elemental.fire = 1;
    this.mob.status.resistance.elemental.cold = -0.5;
  }

  Salamander.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_AuraFire
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Salamander.prototype.meleeAction = function(target) {
    let randNum = getRandomInt(100);
    if (randNum < 50 && this.performBuffIfNotPresent(this.mob._skills[0])) { // Skill_AuraFire
      return true;
    } else if (randNum < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_Bite
      return this.mob._skills[1].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Salamander.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 200, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[2].push(Salamander);

  //-----------------------------------------------------------------------------------
  // FireHorse

  FireHorse = function () {
    this.initialize.apply(this, arguments);
  }
  FireHorse.keepDistance = 1;

  FireHorse.prototype = Object.create(Game_Mob.prototype);
  FireHorse.prototype.constructor = FireHorse;

  FireHorse.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Flame_Horse', 0);
    this.mob.status.resistance.elemental.fire = 0.8;
    this.mob.status.resistance.elemental.cold = -0.3;
  }

  FireHorse.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_FirePath
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return this.moveInLineWithCharacter(target, FireHorse.keepDistance);
  }

  FireHorse.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80 && distance < 3) { // Skill_Charge
      let skill = this.mob._skills[1];
      if (SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    if (CharUtils.getTargetEffect(this.mob, window[this.mob._skills[0].constructor.name])
      && distance == 1) {
      // with fire path, keep distance
      let target = MapUtils.getCharXy(x, y);
      return this.moveAwayFromCharacter(target);
    }
    return false;
  }

  FireHorse.prototype.meleeAction = function(target) {
    let randNum = getRandomInt(100);
    if (randNum < 50 && this.performBuffIfNotPresent(this.mob._skills[0])) { // Skill_FirePath
      return true;
    } else if (randNum < 80 && this.moveAwayFromCharacter(target)) { // keep distance
      return true;
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  FireHorse.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 300, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[2].push(FireHorse);

  //-----------------------------------------------------------------------------------
  // Fire_Spirit

  Fire_Spirit = function () {
    this.initialize.apply(this, arguments);
  }

  Fire_Spirit.prototype = Object.create(Game_Mob.prototype);
  Fire_Spirit.prototype.constructor = Fire_Spirit;

  Fire_Spirit.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Fairy', 3);
    this.mob.status.resistance.elemental.fire = 1;
    this.mob.status.resistance.elemental.cold = -0.5;
  }

  Fire_Spirit.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Fire_Spirit.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_FireBall
      let skill = this.mob._skills[1];
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Fire_Spirit.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_FireBall
      return this.mob._skills[1].action(this, target._x, target._y);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Fire_Spirit.prototype.looting = function () {
    var lootings = [];
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[2].push(Fire_Spirit);

  //-----------------------------------------------------------------------------------
  // Phoenix

  Phoenix = function () {
    this.initialize.apply(this, arguments);
  }

  Phoenix.prototype = Object.create(Game_Mob.prototype);
  Phoenix.prototype.constructor = Phoenix;

  Phoenix.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Phoenix', 0);
    this.mob.status.resistance.elemental.fire = 0.8;
    this.mob.status.resistance.elemental.cold = -0.3;
    if (!this.mob.superRegenTimestamp) {
      this.mob.superRegenTimestamp = 0;
    }
  }

  // set cooldown for Skill_SuperRegen
  Phoenix.coolDown = 400;

  Phoenix.prototype.performSuperRegen = function() {
    if (this.mob.hp < this.mob.mhp * 0.5
      && $gameVariables[0].gameTime - this.mob.superRegenTimestamp > Phoenix.coolDown) { // Skill_SuperRegen
      let performed = this.performBuffIfNotPresent(this.mob._skills[0]);
      if (performed) {
        this.mob.superRegenTimestamp = $gameVariables[0].gameTime;
        return true;
      }
    }
    return false;
  }

  Phoenix.prototype.targetInSightAction = function(target) {
    return this.performSuperRegen();
  }

  Phoenix.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) { // Skill_FireBall
      let skill = this.mob._skills[1];
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Phoenix.prototype.meleeAction = function(target) {
    if (this.performSuperRegen()) {
      // already done action
    } else if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[2])) { // Skill_Pierce
      return this.mob._skills[2].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Phoenix.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(100) < 30) {
      lootings.push(new Flesh(this.mob, 250, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[2].push(Phoenix);

  //-----------------------------------------------------------------------------------
  // Fire_Dragon

  Fire_Dragon = function () {
    this.initialize.apply(this, arguments);
  }

  Fire_Dragon.prototype = Object.create(Game_Mob.prototype);
  Fire_Dragon.prototype.constructor = Fire_Dragon;

  Fire_Dragon.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Dragon', 3);
    this.mob.status.resistance.elemental.fire = 1;
  }

  Fire_Dragon.prototype.targetInSightAction = function(target) {
    if (getRandomInt(100) < 40) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  Fire_Dragon.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      skill = this.mob._skills[2]; // Skill_FireBall
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Fire_Dragon.prototype.penetrateAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[3]; // Skill_FireBreath
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  Fire_Dragon.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 30 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_Bash
      return this.mob._skills[1].action(this, target);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  Fire_Dragon.prototype.looting = function () {
    var lootings = [];
    if (getRandomInt(10) < 3) {
      lootings.push(new Flesh(this.mob, 500, 100, 'FRESH'));
    }
    Game_Mob.prototype.looting.call(this, lootings);
  }
  CharUtils.mobTemplates[2].push(Fire_Dragon);

  //-----------------------------------------------------------------------------------
  // FireKing
  // 
  // Fire dungeon boss

  FireKing = function () {
    this.initialize.apply(this, arguments);
  }

  FireKing.prototype = Object.create(Game_Mob.prototype);
  FireKing.prototype.constructor = FireKing;

  FireKing.prototype.isBoss = true;

  FireKing.prototype.initialize = function (x, y, fromData) {
    Game_Mob.prototype.initialize.call(this, x, y, fromData);
    this.setImage('Evil2', 4);
    this.mob.status.resistance.elemental.fire = 1;
    this.mob.status.resistance.elemental.cold = -0.3;
  }

  FireKing.prototype.targetInSightAction = function(target) {
    if (!$gameVariables[0].eventState.fireKingEncountered) {
      $gameVariables[0].eventState.fireKingEncountered = true;
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.fireKingEncountered);
    } else if (AudioManager._currentBgm.name != 'Battle2') {
      AudioManager.playBgm({name: 'Battle2', pan: 0, pitch: 100, volume: 100});
    }
    if (this.performBuffIfNotPresent(this.mob._skills[3])) { // Skill_AuraFire
      // already done action
    } else if (getRandomInt(100) < 60) { // Skill_Barrier
      return this.performBuffIfNotPresent(this.mob._skills[0]);
    }
    return false;
  }

  FireKing.prototype.projectileAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[1]; // Skill_FireBall
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  FireKing.prototype.penetrateAction = function(x, y, distance) {
    if (getRandomInt(100) < 80) {
      let skill = this.mob._skills[2]; // Skill_FireBreath
      if (distance <= skill.getDistance() && SkillUtils.canPerform(this.mob, skill)) {
        skill.action(this, x, y);
        return true;
      }
    }
    return false;
  }

  FireKing.prototype.meleeAction = function(target) {
    if (getRandomInt(100) < 40 && SkillUtils.canPerform(this.mob, this.mob._skills[1])) { // Skill_FireBall
      return this.mob._skills[1].action(this, target._x, target._y);
    } else {
      return BattleUtils.meleeAttack(this, target);
    }
  }

  FireKing.prototype.looting = function () {
    var lootings = [];
    // TODO: implements looting
    Game_Mob.prototype.looting.call(this, lootings);
    setTimeout(() => {
      MapUtils.playEventFromTemplate($gameVariables[0].templateEvents.fireKingDefeated);
    }, 200);
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
      // check tutorial
      TimeUtils.tutorialHandler.addTutorialWhenGet(this.item());

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
      } else if (ItemUtils.getSetStackNum(this.tempItems, this.tempWeapons, this.tempArmors) >= carryObjectMaxNum) {
        // exceed maximum object carry number
        this.popSceneAndRestoreItems();
        let func = function() {
          MapUtils.addBothLog(Message.display('getItemFailedMaxNum'));
        }
        setTimeout(func, 200);
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
        if (paramId == 6) { // speed
          if (this.status.wetEffect.turns > 0 && this.moveType != 1
            && !SkillUtils.getSkillInstance(this, Skill_AdaptWater)) {
            modifier *= 0.66;
          }
          if (this.status.legWoundedEffect.turns > 0 && this.moveType != 2) {
            modifier *= 0.5;
          }
          switch (this.carryStatus) {
            case 1:
              modifier *= 0.75;
              break;
            case 2:
              modifier *= 0.5;
              break;
            case 3: case 4:
              modifier *= 0.25;
              break;
          }
        }
        if (this.status.bellyStatus == 'FAINT') {
          modifier *= 0.5;
        } else if (this.status.bellyStatus == 'WEAK') {
          modifier *= 0.7;
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
          if (this.status.breakArmorEffect.turns > 0) {
            value = Math.floor(value / 2);
          }
        } else if (attrParamId == 1) {
          let skillEffect = CharUtils.getTargetEffect(this, Skill_Barrier);
          if (skillEffect) {
            value += skillEffect.amount;
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
      let value = this.traitsSum(Game_BattlerBase.TRAIT_XPARAM, xparamId);
      // check difficulty effect
      if (this._actorId && xparamId < 2) {
        switch ($gameVariables[0].difficulty) {
          case 'EASY':
            value += 0.15;
            break;
          case 'HARD': case 'EXTREME':
            value *= 0.8;
        }
      }
      return value;
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
        if (item && !ItemUtils.checkItemIdentified(item)) {
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
          && (ItemUtils.checkItemIdentified(item) == ItemUtils.checkItemIdentified(container[i]))) {
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

  // resume mob data from file
  DataManager.loadGameWithoutRescue = function(savefileId) {
    var globalInfo = this.loadGlobalInfo();
    if (this.isThisGameFile(savefileId)) {
      var json = StorageManager.load(savefileId);
      this.createGameObjects();
      this.extractSaveContents(JsonEx.parse(json));
      this._lastAccessedId = savefileId;
      MapUtils.loadMob();
      return true;
    } else {
      return false;
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
  Window_ItemList.getClassifiedList = function(objList) {
    let result = [];
    for (let i in objList) {
      let added = false;
      for (let j in result) {
        if ((ItemUtils.getItemFullName(result[j]) == ItemUtils.getItemFullName(objList[i]))
          && (ItemUtils.checkItemIdentified(result[j]) == ItemUtils.checkItemIdentified(objList[i]))) {
          added = true;
          break;
        }
      }
      if (!added) {
        result.push(objList[i]);
      }
    }
    return result;
  }

  Window_ItemList.prototype.makeItemList = function () {
    var objList = $gameParty.allItems().filter(function (item) {
      return this.includes(item);
    }, this);
    this._data = Window_ItemList.getClassifiedList(objList);
    if (this.includes(null)) {
      this._data.push(null);
    }
  };

  //-----------------------------------------------------------------------------------
  // Window_FoodList
  //
  // window for items on the map, inherit from Window_ItemList
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
          $gameParty._items.unshift(item);
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
            if ($gameParty.hasSoul(Soul_EatRot)) {
              msg += '\n' + Message.display('eatRottenUneffected');
              let skill = SkillUtils.getSkillInstance($gameActors.actor(1), Skill_EatRot);
              let index = skill.lv - 1;
              $gameActors.actor(1).nutrition
                += Math.floor(item.nutrition * Skill_EatRot.prop.effect[index].nutritionPercentage);
              SkillUtils.gainSkillExp($gameActors.actor(1), skill, Skill_EatRot.prop.effect[index].levelUp);
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
          CharUtils.calcPlayerCarryStatus();
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
          item.name = item.name.substring(0, item.name.length - groundWord.length);
          allDone = false;
          break;
        }
      }
    }
  }

  //-----------------------------------------------------------------------------------
  // Window_PotionList
  //
  // window for potions, inherit from Window_ItemList
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
  // window for scrolls, inherit from Window_ItemList

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

  //-----------------------------------------------------------------------------
  // Window_IdentifyHelp
  //
  // The window for showing identify prompt

  function Window_IdentifyHelp() {
    this.initialize.apply(this, arguments);
  }

  Window_IdentifyHelp.prototype = Object.create(Window_Help.prototype);
  Window_IdentifyHelp.prototype.constructor = Window_IdentifyHelp;

  Window_IdentifyHelp.prototype.setItem = function(item) {
    this.setText(Message.display('identifyPrompt'));
  };

  //-----------------------------------------------------------------------------------
  // Window_IdentifyList
  //
  // window for unidentified objects, inherit from Window_ItemList
  function Window_IdentifyList() {
    this.initialize.apply(this, arguments);
  }

  Window_IdentifyList.prototype = Object.create(Window_ItemList.prototype);
  Window_IdentifyList.prototype.constructor = Window_IdentifyList;

  Window_IdentifyList.prototype.initialize = function (x, y, width, height) {
    Window_ItemList.prototype.initialize.call(this, x, y, width, height);
  };

  Window_IdentifyList.prototype.includes = function (item) {
    try {
      return item && !ItemUtils.checkItemIdentified(item);
    } catch (e) {
      // do nothing
    }
    return false;
  }

  Window_IdentifyList.prototype.isEnabled = function(item) {
    return item;
  };

  //-----------------------------------------------------------------------------------
  // Scene_Identify
  //
  // handle the action when reading Scroll_Identify
  Scene_Identify = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_Identify.prototype = Object.create(Scene_Item.prototype);
  Scene_Identify.prototype.constructor = Scene_Identify;

  Scene_Identify.prototype.initialize = function () {
    Scene_Item.prototype.initialize.call(this);
  };

  Scene_Identify.prototype.create = function() {
    Scene_ItemBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createItemWindow();
    this.createActorWindow();
  };

  Scene_Identify.prototype.createHelpWindow = function() {
    this._helpWindow = new Window_IdentifyHelp();
    this.addWindow(this._helpWindow);
  }

  Scene_Identify.prototype.createItemWindow = function () {
    var wy = this._helpWindow.y + this._helpWindow.height;
    var wh = Graphics.boxHeight - wy;
    this._itemWindow = new Window_IdentifyList(0, wy, Graphics.boxWidth, wh);
    this._itemWindow.setHelpWindow(this._helpWindow);
    this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
    this._itemWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._itemWindow);
    this.activateItemWindow();
    this._itemWindow.selectLast();
  };

  Scene_Identify.prototype.onItemOk = function () {
    if (this.item()) {
      this.popScene();
      var func = function (item) {
        let unknownName = ItemUtils.getItemDisplayName(item);
        ItemUtils.identifyObject(item);
        MapUtils.addBothLog(String.format(Message.display('scrollIdentifyRead'), unknownName, item.name));
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
  // Window_CraftTypeCommand
  //
  // The window for selecting craft type command on craft scene.

  function Window_CraftTypeCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_CraftTypeCommand.prototype = Object.create(Window_ShopCommand.prototype);
  Window_CraftTypeCommand.prototype.constructor = Window_CraftTypeCommand;

  Window_CraftTypeCommand.prototype.makeCommandList = function() {
    this.addCommand('武器', 'weapon');
    this.addCommand('防具', 'armor');
    this.addCommand('飾品', 'accessory');
    this.addCommand('藥水', 'potion');
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

  Window_CraftRecipes.prototype.drawItemName = function(item, x, y, width) {
    width = width || 312;
    if (item) {
        var iconBoxWidth = Window_Base._iconWidth + 4;
        this.resetTextColor();
        this.drawIcon(item.iconIndex, x + 2, y + 2);
        let name = window[item.constructor.name].itemName;
        if ($gameVariables[0].defaultProjectile
          && ItemUtils.getItemDisplayName(item) == ItemUtils.getItemDisplayName($gameVariables[0].defaultProjectile)) {
          name += ' {投擲}';
        }
        this.drawText(name, x + iconBoxWidth, y, width - iconBoxWidth);
    }
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

  Window_CraftRecipes.prototype.updateShopGoods = function(goods) {
    this._shopGoods = goods;
    this._index = 0;
    this.refresh();
  }

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
      let msg = '需要材料/現有材料:';
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
      // calculate player inventory material count
      let inventory = $gameParty.allItems();
      let hasAmount = 0;
      for (let i = 0; i < inventory.length; i++) {
        if (inventory[i].constructor.name == item.constructor.name) {
          hasAmount++;
        }
      }
      var iconBoxWidth = Window_Base._iconWidth + 4;
      this.resetTextColor();
      this.drawIcon(item.iconIndex, x + 2, y + 2);
      this.drawText(ItemUtils.getItemDisplayName(item) + ' x ' + amount + '/' + hasAmount
        , x + iconBoxWidth, y, width - iconBoxWidth);
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
    this._recipes = [[], [], [], []]; // 0: weapon, 1: armor, 2: accessory, 3: potion
    for (let id in ItemUtils.recipes) {
      let recipe = ItemUtils.recipes[id];
      if (CraftUtils.hasMaterialFromRecipe(recipe)) {
        let instance = new recipe();
        let prop = JSON.parse(instance.note);
        let index;
        switch (prop.type) {
          case 'WEAPON': case 'DART':
            index = 0;
            break;
          case 'ARMOR':
            index = 1;
            break;
          case 'ACCESSORY':
            index = 2;
            break;
          case 'POTION':
            index = 3;
            break;
        }
        this._recipes[index].push(instance);
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
    this.createCraftTypeCommandWindow();
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
    this._commandWindow.setHandler('craft',    this.commandCraftType.bind(this));
    // this._commandWindow.setHandler('enforce',   this.commandEnforce.bind(this));
    this._commandWindow.setHandler('cancel', this.popScene.bind(this));
    this.addWindow(this._commandWindow);
  };

  Scene_Craft.prototype.createCraftTypeCommandWindow = function() {
    this._craftTypeCommandWindow = new Window_CraftTypeCommand(Graphics.boxWidth);
    this._craftTypeCommandWindow.y = this._craftHelpWindow.height;
    this._craftTypeCommandWindow.setHandler('weapon', this.commandCraft.bind(this, 0));
    this._craftTypeCommandWindow.setHandler('armor', this.commandCraft.bind(this, 1));
    this._craftTypeCommandWindow.setHandler('accessory', this.commandCraft.bind(this, 2));
    this._craftTypeCommandWindow.setHandler('potion', this.commandCraft.bind(this, 3));
    this._craftTypeCommandWindow.setHandler('cancel', this.onCraftTypeCancel.bind(this));
    this._craftTypeCommandWindow.hide();
    this.addWindow(this._craftTypeCommandWindow);
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
    this._craftWindow = new Window_CraftRecipes(0, wy, wh, []); // goods depend on choices
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

  Scene_Craft.prototype.activateCraftTypeWindow = function() {
    this._craftTypeCommandWindow.show();
    this._craftTypeCommandWindow.activate();
  }

  Scene_Craft.prototype.activateCraftWindow = function() {
    this._craftWindow.show();
    this._craftWindow.activate();
    this._craftStatusWindow.show();
  };

  Scene_Craft.prototype.commandCraftType = function() {
    this._commandWindow.hide();
    this.activateCraftTypeWindow();
  }

  Scene_Craft.prototype.onCraftTypeCancel = function() {
    this._craftTypeCommandWindow.hide();
    this._commandWindow.show();
    this._commandWindow.activate();
  }

  Scene_Craft.prototype.commandCraft = function(type) {
    this._craftWindow.updateShopGoods(this._recipes[type]);
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
    this._craftTypeCommandWindow.activate();
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
      // apply materials attribute
      if (this._item instanceof EquipTemplate) {
        this._item.applyMaterials(this._materialStack);
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
        MapUtils.addBothLog(msg);
      }, 100, this.equips()[slotId]);
      return false;
    }
    if (item && !ItemUtils.checkItemIdentified(item)) {
      ItemUtils.identifyObject(item);
      let array = $gameParty.allItems();
      for (let id in array) {
        if (ItemUtils.getItemFullName(array[id]) == ItemUtils.getItemFullName(item)) {
          ItemUtils.identifyObject(array[id]);
        }
      }
    }
    let msg = '';
    if (this.equips()[slotId]) {
      msg += String.format(Message.display('removeEquip'), this.equips()[slotId].name);
      this.equips()[slotId].onRemove(this);
    }
    if (this.tradeItemWithParty(item, this.equips()[slotId])
      && (!item || this.equipSlots()[slotId] === item.etypeId)) {
      this._equips[slotId].setObject(item);
      this.refresh();
    }
    if (item) {
      msg += String.format(Message.display('wearEquip'), item.name);
      item.onWear(this);
    }
    LogUtils.addLog(msg);
    return true;
  };

  Game_Actor.prototype.levelUp = function() {
    this._level++;
    this.changeExp(this.expForLevel(this._level), true);
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
    this.gainExp(Soul_Chick.expAfterAmplify(exp * (1 + 0.2 * modifier)));
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

  // modify this so we can assign exp per level
  Game_Actor.prototype.expForLevel = function(level) {
    // define player level up exp gap
    let expPerLevel = [0, 20, 40, 100, 200, 400, 800, 1200, 1600, 2000, 2500, 3000];
    return expPerLevel[level - 1];
  };

  // modify skillMpCost & skillTpCost to support mp/tp reduce
  Game_Actor.prototype.skillMpCost = function(skill) {
    let reduce = 0;
    if (BattleUtils.getWeaponClass(this) == Skill_Staff) {
      let weaponSkill = BattleUtils.getWeaponSkill(this);
      let weapon = this.equips()[0];
      if (weaponSkill) {
        reduce = weaponSkill.manaReducedPercentage() + weapon.manaReducedPercentage();
      }
    }
    let mpCost = 0;
    if (skill.mpCost > 0) {
      mpCost = Math.floor(skill.mpCost * (100 - reduce) / 100);
      mpCost = (mpCost == 0) ? 1 : mpCost;
    }
    return mpCost;
  };

  Game_Actor.prototype.skillTpCost = function(skill) {
    return skill.tpCost;
  };

  // player gain attribute exp
  Game_Actor.prototype.paySkillCost = function(skill) {
    let mpCost = this.skillMpCost(skill);
    this._mp -= mpCost;
    CharUtils.playerGainWisExp(mpCost);
    // update staff exp if player equips
    if (BattleUtils.getWeaponClass(this) == Skill_Staff && mpCost > 0) {
      let weaponSkill = BattleUtils.getWeaponSkill(this);
      SkillUtils.gainSkillExp(this, weaponSkill, SkillUtils.getWeaponSkillLevelUpExp(weaponSkill.lv)
        , mpCost / 3);
    }
    let tpCost = this.skillTpCost(skill);
    this._tp -= tpCost;
    CharUtils.playerGainAgiExp(tpCost);
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

  //-----------------------------------------------------------------------------
  // Scene_Base
  // 
  // Check whether the game should be triggering a gameover.

  // modify this so we can implement behavior after game over
  Scene_Base.prototype.checkGameover = function() {
    if ($gameParty.isAllDead()) {
      SceneManager.push(Scene_Statistics);
    }
  };

  //-----------------------------------------------------------------------------
  // Scene_Statistics
  //
  // appear when player died, show statistics data
  Scene_Statistics = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_Statistics.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_Statistics.prototype.constructor = Scene_Statistics;

  Scene_Statistics.prototype.initialize = function () {
    Scene_MenuBase.prototype.initialize.call(this);
  }

  Scene_Statistics.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createLogWindow();
  };

  Scene_Statistics.prototype.stop = function() {
      Scene_MenuBase.prototype.stop.call(this);
      this._commandWindow.close();
  };

  Scene_Statistics.prototype.createBackground = function() {
    Scene_MenuBase.prototype.createBackground.call(this);
    this.setBackgroundOpacity(128);
  };

  Scene_Statistics.prototype.createLogWindow = function() {
    this._commandWindow = new Window_Statistics();
    let result = '';
    for (var id in $gameVariables[0].logList) {
      result += $gameVariables[0].logList[id] + '\n';
    }
    this._commandWindow.contents.clear();
    this._commandWindow.drawTextEx(result, 0, 0);
    this._commandWindow.setHandler('ok', this.gameOver.bind(this));
    this._commandWindow.setHandler('cancel', this.gameOver.bind(this));
    this._commandWindow.activate();
    this.addWindow(this._commandWindow);
  }

  Scene_Statistics.prototype.gameOver = function() {
    // if ($gameVariables[0].lastSavefileId != 0) {
    //   StorageManager.remove($gameVariables[0].lastSavefileId);
    // }
    SceneManager.goto(Scene_Gameover);
  }

  //-----------------------------------------------------------------------------
  // Window_Statistics
  //
  // window to show statistics info
  function Window_Statistics() {
    this.initialize.apply(this, arguments);
  }

  Window_Statistics.prototype = Object.create(Window_Selectable.prototype);
  Window_Statistics.prototype.constructor = Window_Statistics;

  Window_Statistics.prototype.initialize = function() {
    Window_Selectable.prototype.initialize(0, 0, Graphics.boxWidth, Graphics.boxHeight);
  }

  //-----------------------------------------------------------------------------
  // Scene_Save
  //
  // The scene class of the save screen.

  // modify this to recognize player's last savefileId
  Scene_Save.prototype.onSavefileOk = function() {
    Scene_File.prototype.onSavefileOk.call(this);
    $gameSystem.onBeforeSave();
    if (DataManager.saveGame(this.savefileId())) {
      $gameVariables[0].lastSavefileId = this.savefileId();
      this.onSaveSuccess();
    } else {
      this.onSaveFailure();
    }
  }

  //-----------------------------------------------------------------------------
  // Scene_Load
  //
  // The scene class of the load screen.

  // modify this to recognize player's last savefileId
  Scene_Load.prototype.onSavefileOk = function() {
    Scene_File.prototype.onSavefileOk.call(this);
    if (DataManager.loadGame(this.savefileId())) {
      $gameVariables[0].lastSavefileId = this.savefileId();
      this.onLoadSuccess();
    } else {
      this.onLoadFailure();
    }
  };

  //-----------------------------------------------------------------------------
  // Window_MenuCommand
  //
  // The window for selecting a command on the menu screen.
  // Modify this to show our desired menu

  Window_MenuCommand.prototype.makeCommandList = function() {
    this.addFormationCommand();
    this.addMainCommands();
    this.addOriginalCommands();
    this.addOptionsCommand();
    this.addSaveCommand();
    this.addGameEndCommand();
  };

  Window_MenuCommand.prototype.addFormationCommand = function() {
    if (this.needsCommand('formation')) {
      this.addCommand('操作指令', 'formation', true);
    }
  };

  //-----------------------------------------------------------------------------
  // Window_Selectable
  //
  // The window class with cursor movement and scroll functions.

  // modify this so we can use PageUp/PageDown
  Window_Selectable.prototype.processCursorMove = function() {
    if (this.isCursorMovable()) {
      var lastIndex = this.index();
      if (Input.isRepeated('down')) {
        this.cursorDown(Input.isTriggered('down'));
      }
      if (Input.isRepeated('up')) {
        this.cursorUp(Input.isTriggered('up'));
      }
      if (Input.isRepeated('right')) {
        this.cursorRight(Input.isTriggered('right'));
      }
      if (Input.isRepeated('left')) {
        this.cursorLeft(Input.isTriggered('left'));
      }
      if (!this.isHandled('Numpad3') && Input.isTriggered('Numpad3')) {
        this.cursorPagedown();
      }
      if (!this.isHandled('Numpad9') && Input.isTriggered('Numpad9')) {
        this.cursorPageup();
      }
      if (this.index() !== lastIndex) {
        SoundManager.playCursor();
      }
    }
  };

  //-----------------------------------------------------------------------------
  // Window_ControlCommand
  //
  // The window for selecting a control of player character

  function Window_ControlCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_ControlCommand.prototype = Object.create(Window_Command.prototype);
  Window_ControlCommand.prototype.constructor = Window_ControlCommand;

  Window_ControlCommand.prototype.initialize = function(x, y) {
      Window_Command.prototype.initialize.call(this, x, y);
  };

  Window_ControlCommand.prototype.makeCommandList = function() {
    this.addCommand('近身攻擊', 'melee', true);
    this.addCommand('戰技', 'war', true);
    this.addCommand('魔法', 'magic', true);
    this.addCommand('投射物品', 'fire', true);
    this.addCommand('預設投射物', 'setFire', true);
    this.addCommand('向下走一層', 'walkDown', true);
    this.addCommand('向上走一層', 'walkUp', true);
    this.addCommand('查看物品欄', 'inventory', true);
    this.addCommand('撿起物品', 'get', true);
    this.addCommand('丟下物品', 'drop', true);
    this.addCommand('開門', 'open', true);
    this.addCommand('關門', 'close', true);
    this.addCommand('用腳踹', 'kick', true);
    this.addCommand('穿脫裝備', 'wear', true);
    this.addCommand('吃東西', 'eat', true);
    this.addCommand('查看紀錄', 'log', true);
    this.addCommand('閱讀卷軸', 'read', true);
    this.addCommand('飲用藥水', 'quaff', true);
    this.addCommand('合成物品', 'mix', true);
    this.addCommand('搜尋隱藏機關', 'search', true);
    this.addCommand('儲存檔案', 'save', true);
    this.addCommand('開啟說明頁面', 'help', true);
  }

  Window_ControlCommand.prototype.windowWidth = function() {
    return 240;
  };

  Window_ControlCommand.prototype.numVisibleRows = function() {
    return 20;
  };

  //-----------------------------------------------------------------------------
  // Scene_Menu
  //
  // The scene class of the menu screen.
  // Modify this to show our desired menu

  Scene_Menu.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createCommandWindow();
    this.createControlWindow();
    // this.createGoldWindow();
    this.createStatusWindow();
  };

  Scene_Menu.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_MenuCommand(0, 0);
    this._commandWindow.setHandler('formation', this.commandFormation.bind(this));
    this._commandWindow.setHandler('item',      this.commandItem.bind(this));
    this._commandWindow.setHandler('skill',     this.commandPersonalSkill.bind(this));
    this._commandWindow.setHandler('equip',     this.commandPersonalEquip.bind(this));
    this._commandWindow.setHandler('status',    this.commandPersonalStatus.bind(this));
    this._commandWindow.setHandler('options',   this.commandOptions.bind(this));
    this._commandWindow.setHandler('save',      this.commandSave.bind(this));
    this._commandWindow.setHandler('gameEnd',   this.commandGameEnd.bind(this));
    this._commandWindow.setHandler('cancel',    this.popScene.bind(this));
    this.addWindow(this._commandWindow);
  };

  Scene_Menu.prototype.commandPersonalSkill = function() {
    SceneManager.push(Scene_Skill);
  }

  Scene_Menu.prototype.commandPersonalEquip = function() {
    SceneManager.push(Scene_Equip);
  }

  Scene_Menu.prototype.commandPersonalStatus = function() {
    SceneManager.push(Scene_Status);
  }

  Scene_Menu.prototype.commandFormation = function() {
    this._commandWindow.hide();
    this._controlWindow.show();
    this._controlWindow.activate();
  };

  Scene_Menu.prototype.createControlWindow = function() {
    this._controlWindow = new Window_ControlCommand(0, 0);
    this._controlWindow.setHandler('war', this.onWar.bind(this));
    this._controlWindow.setHandler('magic', this.onMagic.bind(this));
    this._controlWindow.setHandler('fire', this.onFire.bind(this));
    this._controlWindow.setHandler('setFire', this.onSetFire.bind(this));
    this._controlWindow.setHandler('melee', this.onMelee.bind(this));
    this._controlWindow.setHandler('walkDown', this.onWalkDown.bind(this));
    this._controlWindow.setHandler('walkUp', this.onWalkUp.bind(this));
    this._controlWindow.setHandler('inventory', this.onInventory.bind(this));
    this._controlWindow.setHandler('get', this.onGet.bind(this));
    this._controlWindow.setHandler('drop', this.onDrop.bind(this));
    this._controlWindow.setHandler('open', this.onOpen.bind(this));
    this._controlWindow.setHandler('close', this.onClose.bind(this));
    this._controlWindow.setHandler('kick', this.onKick.bind(this));
    this._controlWindow.setHandler('wear', this.onWear.bind(this));
    this._controlWindow.setHandler('eat', this.onEat.bind(this));
    this._controlWindow.setHandler('log', this.onLog.bind(this));
    this._controlWindow.setHandler('read', this.onRead.bind(this));
    this._controlWindow.setHandler('quaff', this.onQuaff.bind(this));
    this._controlWindow.setHandler('mix', this.onMix.bind(this));
    this._controlWindow.setHandler('search', this.onSearch.bind(this));
    this._controlWindow.setHandler('save', this.onSave.bind(this));
    this._controlWindow.setHandler('help', this.onHelp.bind(this));
    this._controlWindow.setHandler('cancel', this.onControlCancel.bind(this));
    this._controlWindow.hide();
    this.addWindow(this._controlWindow);
  }

  Scene_Menu.prototype.onControlCancel = function() {
    this._controlWindow.hide();
    this._commandWindow.show();
    this._commandWindow.activate();
  }

  Scene_Menu.createKeyEvent = function(key, code) {
    return {key: key, keyCode: 65, code: code};
  }

  Scene_Menu.prototype.onWar = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('W'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onMagic = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('C'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onFire = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('f'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onSetFire = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('Q'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onMelee = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('F'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onWalkDown = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('>'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onWalkUp = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('<'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onInventory = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('i'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onGet = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('g'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onDrop = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('d'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onOpen = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('o'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onClose = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('c'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onKick = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('k'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onWear = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('w'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onEat = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('e'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onLog = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('/'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onRead = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('r'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onQuaff = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('q'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onMix = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('M'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onSearch = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('s'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onSave = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('S'));
    }, controlCommandDelay);
  }

  Scene_Menu.prototype.onHelp = function() {
    SceneManager.pop();
    setTimeout(function() {
      Input._onKeyDown(Scene_Menu.createKeyEvent('h'));
    }, controlCommandDelay);
  }

  TouchInput._onLeftButtonDown = function(event) {
    var x = Graphics.pageToCanvasX(event.pageX);
    var y = Graphics.pageToCanvasY(event.pageY);
    if (SceneManager._scene instanceof Scene_Map) {
      let deltaX = Math.round((x - $gamePlayer.screenX()) / 48);
      let deltaY = Math.round((y - $gamePlayer.screenY()) / 48);
      if (deltaX == 0 && deltaY == 0) {
        Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad5'));
      } else if (deltaX == 0) {
        if (deltaY > 0) {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad2'));
        } else {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad8'));
        }
      } else if (deltaX > 0) {
        if (deltaY > 0) {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad3'));
        } else if (deltaY == 0) {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad6'));
        } else {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad9'));
        }
      } else {
        if (deltaY > 0) {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad1'));
        } else if (deltaY == 0) {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad4'));
        } else {
          Input._onKeyDown(Scene_Menu.createKeyEvent(null, 'Numpad7'));
        }
      }
    } else {
      if (Graphics.isInsideCanvas(x, y)) {
        this._mousePressed = true;
        this._pressedTime = 0;
        this._onTrigger(x, y);
      }
    }
  };

  TouchInput._onRightButtonDown = function(event) {
    if (!$gameVariables[0]) {
      // game not started yet
      return;
    }
    var x = Graphics.pageToCanvasX(event.pageX);
    var y = Graphics.pageToCanvasY(event.pageY);
    if (Graphics.isInsideCanvas(x, y)) {
      if ($gameVariables[0].directionalFlag || $gameVariables[0].messageFlag) {
        Input._onKeyDown(Scene_Menu.createKeyEvent('Escape', 'Escape'));
      } else {
        this._onCancel(x, y);
      }
    }
  };

  //-----------------------------------------------------------------------------
  // Window_CommandDescription
  //
  // The window for showing command help

  function Window_CommandDescription() {
    this.initialize.apply(this, arguments);
  }

  Window_CommandDescription.prototype = Object.create(Window_Help.prototype);
  Window_CommandDescription.prototype.constructor = Window_CommandDescription;

  Window_CommandDescription.prototype.initialize = function(leftIndent) {
    var width = Graphics.boxWidth - leftIndent;
    var height = Graphics.boxHeight;
    Window_Base.prototype.initialize.call(this, leftIndent, 0, width, height);
    this._text = '';
  }

  //-----------------------------------------------------------------------------
  // Window_HelpCommand
  //
  // The window for selecting a help page

  function Window_HelpCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_HelpCommand.splitMsg = function(text) {
    let results = [];
    let needSplit;
    do {
      needSplit = false;
      for (let i = 0; i < text.length; i++) {
        let subString = text.substring(0, i + 1);
        if (messageWindow.textWidth(subString) >= Graphics.boxWidth - 230) {
          needSplit = true;
          results.push(subString);
          text = text.substring(i + 1, text.length + 1);
          break;
        }
      }
    } while (needSplit);
    results.push(text);
    return results;
  }

  Window_HelpCommand.list = [];
  Window_HelpCommand.list[0] = 'helpMsg';
  Window_HelpCommand.list[1] = ['tutorialMove3', 'tutorialMove4', 'tutorialMove5', 'tutorialMove6'];
  Window_HelpCommand.list[2] = ['tutorialMeleeAttack1', 'tutorialMeleeAttack2', 'tutorialMeleeAttack3'];
  Window_HelpCommand.list[3] = ['tutorialGetDrop1', 'tutorialGetDrop2', 'tutorialGetDrop3', 'tutorialGetDrop4'];
  Window_HelpCommand.list[4] = ['tutorialInventory1', 'tutorialInventory2'];
  Window_HelpCommand.list[5] = ['tutorialEquip1', 'tutorialEquip2', 'tutorialEquip3'];
  Window_HelpCommand.list[6] = ['tutorialSoul1', 'tutorialSoul2', 'tutorialSoul3', 'tutorialSoul4', 'tutorialSoul5'];
  Window_HelpCommand.list[7] = ['tutorialDoor1', 'tutorialDoor2'];
  Window_HelpCommand.list[8] = ['tutorialSecretDoor1', 'tutorialSecretDoor2', 'tutorialSecretDoor3'];
  Window_HelpCommand.list[9] = ['tutorialTrap1', 'tutorialTrap2'];
  Window_HelpCommand.list[10] = ['tutorialLog1', 'tutorialLog2'];
  Window_HelpCommand.list[11] = ['tutorialScroll1', 'tutorialScroll2'];
  Window_HelpCommand.list[12] = ['tutorialPotion1', 'tutorialPotion2'];
  Window_HelpCommand.list[13] = ['tutorialStair1', 'tutorialStair1', 'tutorialStair3'];
  Window_HelpCommand.list[14] = ['tutorialBelly1', 'tutorialBelly2'];
  Window_HelpCommand.list[15] = ['tutorialMix1'];
  Window_HelpCommand.list[16] = ['tutorialDart1', 'tutorialDart2'];
  Window_HelpCommand.list[17] = ['tutorialSave1'];
  Window_HelpCommand.list[18] = ['tutorialCarry1'];
  Window_HelpCommand.list[19] = ['tutorialHotKey1', 'tutorialHotKey2', 'tutorialHotKey3'];
  Window_HelpCommand.list[20] = ['tutorialWeapon2', 'tutorialWeapon3', 'tutorialWeapon4'];

  Window_HelpCommand.prototype = Object.create(Window_Command.prototype);
  Window_HelpCommand.prototype.constructor = Window_HelpCommand;

  Window_HelpCommand.prototype.initialize = function(x, y) {
    Window_Command.prototype.initialize.call(this, x, y);
  };

  Window_HelpCommand.prototype.makeCommandList = function() {
    this.addCommand('指令列表', 'commandList', true);
    this.addCommand('角色移動', 'move', true);
    this.addCommand('近身攻擊', 'meleeAttack', true);
    this.addCommand('撿拾/丟棄', 'getDrop', true);
    this.addCommand('查看物品欄', 'inventory', true);
    this.addCommand('裝備', 'equip', true);
    this.addCommand('魂的吸收', 'soul', true);
    this.addCommand('開關門', 'door', true);
    this.addCommand('隱藏門', 'secretDoor', true);
    this.addCommand('陷阱', 'trap', true);
    this.addCommand('歷史訊息', 'log', true);
    this.addCommand('卷軸', 'scroll', true);
    this.addCommand('藥水', 'scroll', true);
    this.addCommand('階梯', 'stair', true);
    this.addCommand('飽食度', 'belly', true);
    this.addCommand('合成', 'mix', true);
    this.addCommand('飛鏢', 'dart', true);
    this.addCommand('存檔', 'save', true);
    this.addCommand('負重', 'carry', true);
    this.addCommand('技能快捷鍵', 'hotKey', true);
    this.addCommand('武器系統', 'weapon', true);
  }

  Window_HelpCommand.prototype.windowWidth = function() {
    return 150;
  };

  Window_HelpCommand.prototype.numVisibleRows = function() {
    return 20;
  };

  Window_HelpCommand.prototype.callUpdateHelp = function() {
    if (this._helpWindow) {
      if (this._index == 0) {
        this._helpWindow.setText(Message.display(Window_HelpCommand.list[0]));
      } else {
        let result = '';
        for (let id in Window_HelpCommand.list[this._index]) {
          let msgs = Window_HelpCommand.splitMsg(Message.display(Window_HelpCommand.list[this._index][id]));
          for (let id in msgs) {
            result += msgs[id] + '\n';
          }
          result += '\n';
        }
        this._helpWindow.setText(result);
      }
    }
  }

  //-----------------------------------------------------------------------------
  // Scene_Help
  //
  // The scene class of help window

  Scene_Help = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_Help.prototype = Object.create(Scene_Base.prototype);
  Scene_Help.prototype.constructor = Scene_Help;

  Scene_Help.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
  }

  Scene_Help.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this.createWindowLayer();
    this.createHelpWindow();
    this.createCommandWindow();
  }

  Scene_Help.prototype.createBackground = function() {
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
    this.addChild(this._backgroundSprite);
  }

  Scene_Help.prototype.createHelpWindow = function() {
    this._helpWindow = new Window_CommandDescription(150);
    this.addWindow(this._helpWindow);
  }

  Scene_Help.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_HelpCommand();
    this._commandWindow.setHandler('cancel', this.popScene.bind(this));
    this._commandWindow.setHelpWindow(this._helpWindow);
    this.addWindow(this._commandWindow);
  }

  //-----------------------------------------------------------------------------
  // Window_DifficultyHelp
  //
  // The window for showing difficulty help

  function Window_DifficultyHelp() {
    this.initialize.apply(this, arguments);
  }

  Window_DifficultyHelp.prototype = Object.create(Window_Help.prototype);
  Window_DifficultyHelp.prototype.constructor = Window_DifficultyHelp;

  Window_DifficultyHelp.prototype.initialize = function(leftIndent, topIndent) {
    var width = Graphics.boxWidth - leftIndent;
    var height = Graphics.boxHeight - topIndent;
    Window_Base.prototype.initialize.call(this, leftIndent, topIndent, width, height);
    this._text = '';
  }

  //-----------------------------------------------------------------------------
  // Window_DifficultyCommand
  //
  // The window for selecting a game difficulty

  function Window_DifficultyCommand() {
    this.initialize.apply(this, arguments);
  }

  Window_DifficultyCommand.prototype = Object.create(Window_Command.prototype);
  Window_DifficultyCommand.prototype.constructor = Window_DifficultyCommand;

  Window_DifficultyCommand.prototype.initialize = function(x, y) {
    Window_Command.prototype.initialize.call(this, x, y);
  };

  Window_DifficultyCommand.list = [];
  Window_DifficultyCommand.list[0] = 'easyMsg';
  Window_DifficultyCommand.list[1] = 'normalMsg';
  Window_DifficultyCommand.list[2] = 'hardMsg';
  Window_DifficultyCommand.list[3] = 'extremeMsg';

  Window_DifficultyCommand.prototype.makeCommandList = function() {
    this.addCommand('簡單', 'easy', true);
    this.addCommand('一般', 'normal', true);
    this.addCommand('困難', 'hard', true);
    // this.addCommand('極限', 'extreme', true);
  }

  Window_DifficultyCommand.prototype.windowWidth = function() {
    return 150;
  };

  Window_DifficultyCommand.prototype.callUpdateHelp = function() {
    if (this._helpWindow) {
      this._helpWindow.setText(Message.display(Window_DifficultyCommand.list[this._index]));
    }
  }

  //-----------------------------------------------------------------------------
  // Scene_Difficulty
  //
  // The scene class of difficulty selection at the beginning

  Scene_Difficulty = function () {
    this.initialize.apply(this, arguments);
  }

  Scene_Difficulty.prototype = Object.create(Scene_Base.prototype);
  Scene_Difficulty.prototype.constructor = Scene_Difficulty;

  Scene_Difficulty.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
  }

  Scene_Difficulty.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this.createWindowLayer();
    this.createTitleWindow();
    this.createHelpWindow();
    this.createCommandWindow();
  }

  Scene_Difficulty.prototype.createBackground = function() {
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
    this.addChild(this._backgroundSprite);
  }

  Scene_Difficulty.prototype.createTitleWindow = function() {
    this._titleWindow = new Window_Help();
    this._titleWindow.setText('請選擇遊戲難度', 0, 0);
    this.addWindow(this._titleWindow);
  }

  Scene_Difficulty.prototype.createHelpWindow = function() {
    this._helpWindow = new Window_DifficultyHelp(150, this._titleWindow.height);
    this.addWindow(this._helpWindow);
  }

  Scene_Difficulty.prototype.createCommandWindow = function() {
    this._commandWindow = new Window_DifficultyCommand(0, this._titleWindow.height);
    this._commandWindow.setHandler('ok', this.setDifficulty.bind(this));
    // this._commandWindow.setHandler('cancel', this.popScene.bind(this));
    this._commandWindow.setHelpWindow(this._helpWindow);
    this.addWindow(this._commandWindow);
  }

  Scene_Difficulty.prototype.setDifficulty = function() {
    switch (this._commandWindow.index()) {
      case 0:
        $gameVariables[0].difficulty = 'EASY';
        break;
      case 1:
        $gameVariables[0].difficulty = 'NORMAL';
        break;
      case 2:
        $gameVariables[0].difficulty = 'HARD';
        break;
      case 3:
        $gameVariables[0].difficulty = 'EXTREME';
        break;
    }
    this.popScene();
  }

  //-----------------------------------------------------------------------------
  // Game_Message
  //
  // The game object class for the state of the message window that displays text
  // or selections, etc.

  // modify this to auto change line
  Game_Message.prototype.add = function(text) {
    let msgs = Window_HelpCommand.splitMsg(text);
    for (let id in msgs) {
      this._texts.push(msgs[id]);
    }
  };
})();
