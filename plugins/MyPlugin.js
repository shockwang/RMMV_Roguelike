// my plugin

(function() {
    MapData = function(floorId, original, x, y) {
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
    StairData = function() {
        // 0: stair up, 1: stair down
        this.type = 0;
        this.x = 0;
        this.y = 0;
        this.toMapId = -1;
        this.toX = -1;
        this.toY = -1;
    }

    // data type for item piles
    ItemPile = function(x, y) {
        this.x = x;
        this.y = y;
        this.items = {};
        this.weapons = {};
        this.armors = {};
    }

    MapVariable = function(mapData, rmDataMap) {
        this.mapData = mapData;
        this.rmDataMap = rmDataMap;

        // indicates map attributes
        this.generateRandom = false;
        this.stairDownNum = 1;
        this.stairList = [];
        this.itemPileList = [];
    }

    Coordinate = function(x, y) {
        this.x = x;
        this.y = y;
    }

    // class defined for player transfer
    TransferInfo = function(toMapId, x, y) {
        this.toMapId = toMapId;
        this.nowX = x;
        this.nowY = y;
    }

    var FLOOR = '□';
    var CEILING = '■';
    var WALL = 'Ⅲ';
    var DOOR = 'Ｄ';

    // ----------map constants----------
    var ceilingCenter = 5888;
    var wallCenter = 6282;
    var floorCenter = 2816;
    var warFogCenter = 3536;
    var upStair = 19;
    var downStair = 27;

    // item figures
    var bagIcon = 864;

    // door figures
    var doorClosedIcon = 512;
    var doorOpenedIcon = 528;

    // view parameters
    var viewDistance = 8;

    // room parameters
    var roomNum = 3, minRoomSize = 4, maxRoomSize = 16;
    var roomPercentage = 0.6;

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
    var attributeNum = 8;
    //-----------end of game character attributes setup

    // TP designed for energy, attack/martial skills will decrease it, and will
    // auto recover when not doing attack actions
    var playerAttacked = false;
    var playerMoved = false;

    //-----------------------------------------------------------------------------------
    // MapUtils
    //
    // All random map related algorithm/functions

    MapUtils = function() {
        throw new Error('This is a static class');
    };

    MapUtils.initialize = function() {
        // define map variables here
        for (var i = 0; i < 5; i++) {
            $gameVariables[i+1] = new MapVariable(null, null);
        }
        for (var i = 1; i < 5; i++) {
            $gameVariables[i+1].generateRandom = true;
        }
        $gameVariables[5].stairDownNum = 0;

        // initialize $gameVariables[0] for multiple usage
        $gameVariables[0] = {};
        $gameVariables[0].transferInfo = null;
        $gameVariables[0].directionalAction = null;
        $gameVariables[0].directionalFlag = false;
        $gameVariables[0].messageFlag = false;
        $gameVariables[0].messageWindow = null;
        // define game time (counts * gameTimeAmp for possible future extends)
        $gameVariables[0].gameTime = 0;
        $gameVariables[0].gameTimeAmp = 100;
        $gameVariables[0].templateEvents = [];
        // monster template
        $gameVariables[0].templateEvents.push($dataMap.events[3]);
        // door template
        $gameVariables[0].templateEvents.push($dataMap.events[4]);
    }

    MapUtils.displayMessage = function(msg) {
        $gameVariables[0].messageFlag = true;
        if (!$gameVariables[0].messageWindow) {
            var width = Graphics.boxWidth;
            var height = Graphics.boxHeight / 4;
            var y = Graphics.boxHeight - height;
            var messageWindow = new Window_Base(0, y, width, height);
            $gameVariables[0].messageWindow = messageWindow;
        } else {
            $gameVariables[0].messageWindow.contents.clear();
        }
        $gameVariables[0].messageWindow.drawTextEx(msg, 0, 0);
        SceneManager._scene.addChild($gameVariables[0].messageWindow);
    }

    // used when message console already exists on map
    MapUtils.updateMessage = function(msg) {
        $gameVariables[0].messageWindow.contents.clear();
        $gameVariables[0].messageWindow.drawTextEx(msg, 0, 0);
    }

    // used to judge visible/walkable tiles
    MapUtils.isTilePassable = function(tile) {
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
                for (var i = startX+1; i <= endX; i++) {
                    var estimatedY = Math.round(m * (i - src._x) + src._y);

                    // fill y-axis coordinates
                    if (Math.abs(lastY - estimatedY) > 1) {
                        var startY = (lastY - estimatedY > 0) ? estimatedY : lastY;
                        var endY = (lastY - estimatedY > 0) ? lastY : estimatedY;
                        for (var j = startY+1; j < endY; j++) {
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
                for (var i = start+1; i < end; i++) {
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

            // ceiling followed by wall check
            if (visible && mapData[x][y].originalTile == WALL) {
                mapData[x][y-1].isVisible = true;
            }

            // other ceiling check
            if (!visible && mapData[x][y].originalTile == CEILING) {
                if (y+1 < mapData[0].length && mapData[x][y+1].originalTile == WALL && mapData[x][y+1].isVisible) {
                    // ceiling attached with wall
                    visible = true;
                } else {
                    var xVisible = false, yVisible = false;
                    if ((x-1 >= 0 && mapData[x-1][y].isVisible) || (x+1 < mapData.length && mapData[x+1][y].isVisible)) {
                        xVisible = true;
                    }
                    if ((y-1 >= 0 && mapData[x][y-1].isVisible) || (y+1 < mapData[0].length && mapData[x][y+1].isVisible)) {
                        yVisible = true;
                    }
                    if (xVisible && yVisible) {
                        // corner case
                        visible = true;
                    }
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

    MapUtils.translateMap = function(rawData){
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
                    // deal with shadow
                    if (i-1 >= 0 && j-1 >= 0 && MapUtils.isTilePassable(rawData[i][j])
                        && !MapUtils.isTilePassable(rawData[i-1][j]) && !MapUtils.isTilePassable(rawData[i-1][j-1])) {
                        mapData[i][j].shadow = 5;
                    }
                    // skip the floor tunning
                    continue;
                } else if (rawData[i][j] == CEILING) {
                    // deal with ceiling
                    north = false, south = false, east = false, west = false;
                    // check east
                    if (i+1 < rawData.length && rawData[i+1][j] != CEILING) {
                        east = true;
                    }
                    // check west
                    if (i-1 >= 0 && rawData[i-1][j] != CEILING) {
                        west = true;
                    }
                    // check north
                    if (j-1 >= 0 && rawData[i][j-1] != CEILING) {
                        north = true;
                    }
                    // check south
                    if (j+1 < rawData.length && rawData[i][j+1] != CEILING) {
                        south = true;
                    }

                    // now decide tile type
                    mapData[i][j].base = refineMapTile(east, west, south, north, ceilingCenter);
                } else if (rawData[i][j] == WALL) {
                    // deal with wall
                    east = false, west = false;
                    // check east
                    if (i+1 < rawData.length && rawData[i+1][j] != WALL) {
                        east = true;
                    }
                    // check west
                    if (i-1 >= 0 && rawData[i-1][j] != WALL) {
                        west = true;
                    }

                    // now decide tile type
                    var result = wallCenter;
                    if (east) {
                        if (west) {
                            result += 5;
                        } else {
                            result += 4;
                        }
                    } else {
                        if (west) {
                            result += 1;
                        } else {
                            result += 0;
                        }
                    }
                    mapData[i][j].base = result;
                } else if (rawData[i][j] == DOOR) {
                    new Game_Door(i, j);
                }
            }
        }

        return mapData;
    };

    MapUtils.drawMap = function(mapData, mapArray) {
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
                    mapArray[shadowOffset + index] = mapData[i][j].shadow;
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

        // draw items (isolate it because of view design)
        for (var i in $gameVariables[$gameMap.mapId()].itemPileList) {
            var itemPile = $gameVariables[$gameMap.mapId()].itemPileList[i];
            if (mapData[itemPile.x][itemPile.y].isVisible) {
                var index = itemOffset + itemPile.y * mapData.length + itemPile.x;
                mapArray[index] = bagIcon;
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

    MapUtils.drawEvents = function(mapData) {
        for (var i = 0; i < $gameMap.events().length; i++) {
            var event = $gameMap.events()[i];
            if (event._x > 0 && event._y > 0 && mapData[event._x][event._y].isVisible) {
                event.setOpacity(255);
            } else {
                event.setOpacity(0);
            }
        }
    }
    
    MapUtils.findEmptyFromList = function(list) {
        for (var i = 1; i < list.length; i++) {
            if (!list[i]) {
                return i;
            }
        }
        // list is full, extend its length;
        list.length++;
        return list.length - 1;
    }

    MapUtils.transferCharacter = function(character) {
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
            var checkMapReady = function() {
                if (SceneManager.isCurrentSceneStarted()) {
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
            
            // transfer nearby mobs
            
        }
    }
    
    MapUtils.findEventsXyFromDataMap = function(dataMap, x, y) {
        var events = [];
        for (var i in dataMap.events) {
            var event = dataMap.events[i];
            if (event && event.x == x && event.y == y) {
                events.push(event);
            }
        }
        return events;
    }
    
    function isTileAvailableForMob(mapId, x, y) {
        var occupied = false;
        var exists = MapUtils.findEventsXyFromDataMap($gameVariables[mapId].rmDataMap, x, y);
        for (var i in exists) {
            if (exists[i].type == 'MOB' || (exists[i].type == 'DOOR' && exists[i].status != 2)) {
                occupied = true;
            }
        }
        var tileAvailable = false;
        if (MapUtils.isTilePassable($gameVariables[mapId].mapData[x][y].originalTile)) {
            tileAvailable = true;
        }
        return !occupied && tileAvailable;
    }
    
    // nowMapId & toMapId $dataMap should be ready before call this function
    MapUtils.transferNearbyMobs = function(nowMapId, toMapId, nowX, nowY, newX, newY) {
        if (!$gameVariables[nowMapId].generateRandom || !$gameVariables[toMapId].generateRandom) {
            // no need to update static map
            return;
        }
        for (var i = 0; i < 8; i++) {
            var coordinate = MapUtils.getNearbyCoordinate(nowX, nowY, i);
            var events = MapUtils.findEventsXyFromDataMap($dataMap, coordinate.x, coordinate.y);
            for (var id in events) {
                if (events[id].type == 'MOB') {
                    var mobData = events[id];
                    // check for empty space, attempt to stand on the same relative location as player
                    var toCheck = MapUtils.getNearbyCoordinate(newX, newY, i);
                    var placeFound = false;
                    if (isTileAvailableForMob(toMapId, toCheck.x, toCheck.y)) {
                        placeFound = true;
                    }
                    if (!placeFound) {
                        for (var j = 0; j < 8; j++) {
                            toCheck = MapUtils.getNearbyCoordinate(newX, newY, j);
                            if (isTileAvailableForMob(toMapId, toCheck.x, toCheck.y)) {
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
            map[i][0] = CEILING;
        }
        for (var j = 0; j < map[0].length; j++) {
            map[0][j] = CEILING;
        }

        var index = 1;
        for (var i = 0; i < genMap.length; i++) {
            for (var j = 0; j < genMap[i].length; j++) {
                map[i * 2 + index][j * 2 + index] = FLOOR;
                map[i * 2 + 1 + index][j * 2 + 1 + index] = CEILING;
                // check if inside of room
                if (genMap[i][j].isRoom && !genMap[i][j].northWall && !genMap[i][j].eastWall) {
                    map[i * 2 + 1 + index][j * 2 + 1 + index] = FLOOR;
                }

                var north;
                if (genMap[i][j].northWall) {
                    north = CEILING;
                } else if (genMap[i][j].northDoor) {
                    north = DOOR;
                } else {
                    north = FLOOR;
                }
                map[i * 2 + index][j * 2 + 1 + index] = north;

                var east;
                if (genMap[i][j].eastWall) {
                    east = CEILING;
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

    function addWall(map) {
        var map2 = new Array(map.length);
        for (var i = 0; i < map.length; i++) {
            map2[i] = new Array(Math.floor(map[0].length * 1.5));
        }

        var index = 0;
        for (var j = 0; j < map[0].length; j++) {
            var needWall = false;
            for (var i = 0; i < map.length; i++) {
                map2[i][j+index] = map[i][j];
                if (j+1 < map[0].length && map[i][j+1] == FLOOR && map[i][j] == CEILING) {
                    needWall = true;
                    map2[i][j+index+1] = WALL;
                } else if (map[i][j] == DOOR) {
                    map2[i][j+index] = DOOR;
                    map2[i][j+index+1] = FLOOR;
                } else {
                    map2[i][j+index+1] = map[i][j];
                }
            }
            if (needWall) {
                index++;
            }
        }
        return map2;
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
        this.center = new Coordinate(Math.round((2*startX+width)/2), Math.round((2*startY+height)/2));
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
                        if (x+1 < map.length && !map[x+1][y].done) {
                            map[x][y].eastWall = false;
                            xNext++;
                        }
                        break;
                    case 1: // north
                        if (y+1 < map[0].length && !map[x][y+1].done) {
                            map[x][y].northWall = false;
                            yNext++;
                        }
                        break;
                    case 2: // west
                        if (x-1 >= 0 && !map[x-1][y].done) {
                            map[x-1][y].eastWall = false;
                            xNext--;
                        }
                        break;
                    case 3: // south
                        if (y-1 >= 0 && !map[x][y-1].done) {
                            map[x][y-1].northWall = false;
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

    genMapFullMaze = function(width, height) {
        var map = initMaze(width, height);
        fillMaze(map, 0, 0, 0);
        return map;
    }

    function fillRoomSetup(map, newRoom) {
        for (var j = newRoom.start.y; j < newRoom.start.y + newRoom.height; j++) {
            for (var i = newRoom.start.x; i < newRoom.start.x + newRoom.width; i++) {
                if (j+1 < newRoom.start.y + newRoom.height) {
                    // not y-axis border
                    map[i][j].northWall = false;
                }
                if (i+1 < newRoom.start.x + newRoom.width) {
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

    genMapRoomsFullMaze = function(width, height) {
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
        var maxRegions = 20;
        for (var i = 0; i < rooms.length; i++) {
            var regions = new Array(maxRegions);
            for (var j = 0; j < regions.length; j++) {
                regions[j] = [];
            }
            // search edge of the room, divided by regionId
            var room = rooms[i];
            // handle with x-axis direction
            for (var j = room.start.x; j < room.start.x + room.width; j++) {
                if (room.start.y - 1 >= 0 && !map[j][room.start.y-1].isRoom) {
                    regions[map[j][room.start.y-1].regionId].push(new ExitCandidate(map[j][room.start.y], "SOUTH"));
                }
                if (room.start.y + room.height < map[0].length && !map[j][room.start.y+room.height].isRoom) {
                    regions[map[j][room.start.y+room.height].regionId].push(new ExitCandidate(map[j][room.start.y+room.height-1], "NORTH"));
                }
            }
            // handle with y-axis direction
            for (var j = room.start.y; j < room.start.y + room.height; j++) {
                if (room.start.x - 1 >= 0 && !map[room.start.x-1][j].isRoom) {
                    regions[map[room.start.x-1][j].regionId].push(new ExitCandidate(map[room.start.x][j], "WEST"));
                }
                if (room.start.x + room.width < map.length && !map[room.start.x+room.width][j].isRoom) {
                    regions[map[room.start.x+room.width][j].regionId].push(new ExitCandidate(map[room.start.x+room.width-1][j], "EAST"));
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
                        map[exit.cell.x][exit.cell.y-1].northWall = false;
                        map[exit.cell.x][exit.cell.y-1].northDoor = true;
                        break;
                    case "NORTH":
                        exit.cell.northWall = false;
                        exit.cell.northDoor = true;
                        exit.cell.isRoom = false;
                        break;
                    case "WEST":
                        map[exit.cell.x-1][exit.cell.y].eastWall = false;
                        map[exit.cell.x-1][exit.cell.y].eastDoor = true;
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
                        path.push(map[x+1][y]);
                }
            }
        }
    }

    MapUtils.getDistance = function(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    genMapRoomsRoguelike = function(width, height) {
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

    MapUtils.generateMapData = function(genMapFunction, width, height) {
        var mapRaw = genMapFunction(width, height);
        var mapPixel = genMapToMap(mapRaw);
        //return mapPixel;
        return addWall(mapPixel);
    }

    MapUtils.getNearbyCoordinate = function(x, y, index) {
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
    MapUtils.findShortestRoute = function(x1, y1, x2, y2) {
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

    MapUtils.isNearBy = function(x1, y1, x2, y2) {
        if (Math.abs(x1 - x2) < 2 && Math.abs(y1 - y2) < 2) {
            return true;
        }
        return false;
    }

    MapUtils.setupNewMap = function(mapId) {
        // first load map
        console.log("first load map: " + mapId);
        var rawMap = MapUtils.generateMapData(genMapRoomsFullMaze, 9, 6);
        var newMapData = MapUtils.translateMap(rawMap);
        $dataMap.width = rawMap.length;
        $dataMap.height = rawMap[0].length;
        $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
        $gameVariables[mapId].mapData = newMapData;
        $gameVariables[mapId].rmDataMap = $dataMap;
    }

    //-----------------------------------------------------------------------------------
    // DataManager
    //
    // override map loading mechanism
    DataManager.onLoad = function(object) {
        var array;
        if (object === $dataMap) {
            if ($gameMap.mapId() > 0) {
                var targetMapId = ($gameVariables[0].transferInfo) ? $gameVariables[0].transferInfo.toMapId : $gameMap.mapId();
                if ($gameVariables[targetMapId].generateRandom) {
                    if (!$gameVariables[targetMapId].mapData) {
                        // first time assign data
                        MapUtils.setupNewMap(targetMapId);

                        // collect all FLOOR tiles
                        var mapVariable = $gameVariables[$gameMap.mapId()];
                        var targetMapData = $gameVariables[targetMapId].mapData;
                        var floors = [];
                        for (var j = 0; j < targetMapData[0].length; j++) {
                            for (var i = 0; i < targetMapData.length; i++) {
                                if (targetMapData[i][j].originalTile == FLOOR) {
                                    floors.push(targetMapData[i][j]);
                                }
                            }
                        }
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
                                    newStair.toMapId = $gameMap.mapId();
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
                        for (var i = 0; i < $gameVariables[$gameMap.mapId()].stairList.length; i++) {
                            var candidate = $gameVariables[$gameMap.mapId()].stairList[i];
                            if (candidate.x == $gameVariables[0].transferInfo.nowX && candidate.y == $gameVariables[0].transferInfo.nowY) {
                                nowStair = candidate;
                                break;
                            }
                        }
                        $gamePlayer.reserveTransfer(targetMapId, nowStair.toX, nowStair.toY, 0, 2);
                        MapUtils.transferNearbyMobs($gameMap.mapId(), targetMapId, nowStair.x, nowStair.y, nowStair.toX, nowStair.toY);
                        setTimeout('SceneManager.goto(Scene_Map);', 200);
                    } else if ($gameVariables[targetMapId].mapData) {
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
    Game_Player.prototype.moveStraight = function(d) {
        var moved = false;
        if (this.canPass(this.x, this.y, d)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveStraight.call(this, d);
        if (moved) {
            playerMoved = true;
            TimeUtils.afterPlayerMoved();
        }
    };

    Game_Player.prototype.moveDiagonally = function(horz, vert) {
        var moved = false;
        if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveDiagonally.call(this, horz, vert);
        if (moved) {
            playerMoved = true;
            TimeUtils.afterPlayerMoved();
        }
    };

    //-----------------------------------------------------------------------------------
    // Game_CharacterBase
    //
    // Modify moveDiagonally(), so it can trigger diagonal events
    Game_CharacterBase.prototype.moveDiagonally = function(horz, vert) {
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
    Game_CharacterBase.prototype.checkEventTriggerTouchDiagonal = function(horz, vert) {
        var x2 = $gameMap.roundXWithDirection(this._x, horz);
        var y2 = $gameMap.roundYWithDirection(this._y, vert);
        this.checkEventTriggerTouch(x2, y2);
    };

    // modify canPassDiagonally(), so character can move as long as target tile is empty
    Game_CharacterBase.prototype.canPassDiagonally = function(x, y, horz, vert) {
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
    Game_Map.prototype.isPassable = function(x, y, d) {
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
    Game_Map.prototype.setupEvents = function() {
        this._events = [];
        for (var i = 0; i < $dataMap.events.length; i++) {
            if ($dataMap.events[i]) {
                if ($dataMap.events[i].type == 'MOB') {
                    this._events[i] = new Game_Mob($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i].mob._enemyId, $dataMap.events[i]);
                } else if ($dataMap.events[i].type == 'DOOR') {
                    this._events[i] = new Game_Door($dataMap.events[i].x, $dataMap.events[i].y, $dataMap.events[i]);
                } else {
                    this._events[i] = new Game_Event(this._mapId, i);
                }
            }
        }
        this._commonEvents = this.parallelCommonEvents().map(function(commonEvent) {
            return new Game_CommonEvent(commonEvent.id);
        });
        this.refreshTileEvents();
    };

    //-----------------------------------------------------------------------------------
    // Game_Mob
    //
    // The game object class for a mob (aggressive/passive), define mob status in
    // it. (HP/MP/attribute, etc)

    function cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    newDataMapEvent = function(fromObj, id, x, y) {
        var newObj = cloneObject(fromObj);
        newObj.id = id;
        newObj.x = x;
        newObj.y = y;
        return newObj;
    }

    Game_Mob = function() {
        this.initialize.apply(this, arguments);
    }

    Game_Mob.prototype = Object.create(Game_Event.prototype);
    Game_Mob.prototype.constructor = Game_Mob;

    Game_Mob.prototype.fromEvent = function(src, target) {
        target.mob = src.mob;
        target.awareDistance = src.awareDistance;
        target.type = src.type;
        target.x = src.x;
        target.y = src.y;
    }

    Game_Mob.prototype.initStatus = function(event) {
        // NOTE: attribute name must be the same as Game_Actor
        event.mob = this.mob;
        event.awareDistance = 8;
        event.type = 'MOB';
    }

    Game_Mob.prototype.updateDataMap = function() {
        for (var i = 0; i < $gameMap._events.length; i++) {
            if ($gameMap._events[i] == this) {
                Game_Mob.prototype.fromEvent(this, $dataMap.events[i]);
                break;
            }
        }
    }

    Game_Mob.prototype.initialize = function(x, y, mobId, fromData) {
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
            // find empty space for new event
            var eventId = MapUtils.findEmptyFromList($dataMap.events);
            $dataMap.events[eventId] = newDataMapEvent($gameVariables[0].templateEvents[0], eventId, x, y);
            this.initStatus($dataMap.events[eventId]);
            this.initStatus(this);
        }
        // store new events back to map variable
        $gameVariables[$gameMap.mapId()].rmDataMap = $dataMap;
        Game_Event.prototype.initialize.call(this, $gameMap.mapId(), eventId);
        $gameMap._events[eventId] = this;
    };

    Game_Mob.prototype.action = function() {
        // check if player is nearby
        if (Math.abs(this._x - $gamePlayer._x) < 2 && Math.abs(this._y - $gamePlayer._y) < 2) {
            this.turnTowardCharacter($gamePlayer);
            BattleUtils.meleeAttack(this, $gamePlayer);
        } else if (MapUtils.getDistance(this._x, this._y, $gamePlayer._x, $gamePlayer._y) < this.awareDistance) {
            this.moveTowardCharacter($gamePlayer);
        } else {
            this.moveRandom();
        }

        // store data back to $dataMap
        this.updateDataMap();
    }

    // Override moveTowardCharacter() function so mobs can move diagonally
    Game_Mob.prototype.moveTowardCharacter = function(character) {
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

    // Override moveRandom() function so mobs can move diagonally
    Game_Mob.prototype.moveRandom = function() {
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
    Game_Mob.prototype.isCollidedWithEvents = function(x, y) {
        return Game_CharacterBase.prototype.isCollidedWithEvents.call(this, x, y);
    };

    //-----------------------------------------------------------------------------------
    // Game_Door
    //
    // The game object class for a door (opened/closed/locked), inherit from Game_Event
    Game_Door = function() {
        this.initialize.apply(this, arguments);
    }

    Game_Door.prototype = Object.create(Game_Event.prototype);
    Game_Door.prototype.constructor = Game_Door;

    Game_Door.prototype.fromEvent = function(src, target) {
        target.type = src.type;
        target.x = src.x;
        target.y = src.y;
        target.status = src.status;
    }

    Game_Door.prototype.initStatus = function(event) {
        event.type = 'DOOR';
        // 0: locked, 1: closed, 2: opened
        event.status = 1;
    }

    Game_Door.prototype.updateDataMap = function() {
        for (var i = 0; i < $gameMap._events.length; i++) {
            if ($gameMap._events[i] == this) {
                Game_Door.prototype.fromEvent(this, $dataMap.events[i]);
                break;
            }
        }
    }

    Game_Door.prototype.initialize = function(x, y, fromData) {
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
            $dataMap.events.push(newDataMapEvent($gameVariables[0].templateEvents[1], eventId, x, y));
            Game_Door.prototype.initStatus($dataMap.events[$dataMap.events.length-1]);
            this.initStatus(this);
        }
        // store new events back to map variable
        $gameVariables[$gameVariables[0].transferInfo.toMapId].rmDataMap = $dataMap;
        Game_Event.prototype.initialize.call(this, $gameVariables[0].transferInfo.toMapId, eventId);
        $gameMap._events[eventId] = this;
    };

    // try to open a door
    Game_Door.prototype.openDoor = function(character, x, y) {
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
        SceneManager._scene.removeChild($gameVariables[0].messageWindow);
        return true;
    }

    // try to close this door
    Game_Door.prototype.closeDoor = function(character, x, y) {
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
        if (events.length > 1 || $gamePlayer.pos(x, y) || ItemUtils.findMapItemPile(x, y)) {
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
        SceneManager._scene.removeChild($gameVariables[0].messageWindow);
        return true;
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
    Input._signX = function() {
        var x = 0;

        if (this.isTriggered('left')) {
            x--;
        }
        if (this.isTriggered('right')) {
            x++;
        }
        return x;
    };

    Input._signY = function() {
        var y = 0;

        if (this.isTriggered('up')) {
            y--;
        }
        if (this.isTriggered('down')) {
            y++;
        }
        return y;
    };

    // override this function for user-defined key detected (only on Scene_Map)
    Input._onKeyDown = function(event) {
        if (SceneManager._scene instanceof Scene_Map && !$gameMessage.isBusy()) {
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
                SceneManager._scene.removeChild($gameVariables[0].messageWindow);
                return;
            }
            switch (event.key) {
            case '.': case 'Numpad5': // wait action
                TimeUtils.afterPlayerMoved();
                break;
            case '>': // try to go down
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
                    playerMoved = true;
                } else {
                    MapUtils.displayMessage("這裡沒有往下的樓梯.");
                }
                break;
            case '<': // try to go up
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
                    playerMoved = true;
                } else {
                    MapUtils.displayMessage("這裡沒有往上的樓梯.");
                }
                break;
            case ',': // try to pick things up from the ground
                if (ItemUtils.findMapItemPile($gamePlayer._x, $gamePlayer._y)) {
                    SceneManager.push(Scene_OnMapItem);
                } else {
                    MapUtils.displayMessage("這裡沒有東西可以撿.");
                }
                break;
            case 'd': // try to drop things from player inventory
                if (Object.keys($gameParty._items).length == 0 && Object.keys($gameParty._weapons).length == 0
                    && Object.keys($gameParty._armors).length == 0) {
                    MapUtils.displayMessage("你的身上沒有任何物品.");
                } else {
                    SceneManager.push(Scene_DropItem);
                }
                break;
            case 'o': // try to open a door
                $gameVariables[0].directionalAction = Game_Door.prototype.openDoor;
                $gameVariables[0].directionalFlag = true;
                MapUtils.displayMessage('開哪個方向的門?');
                break;
            case 'c': // try to close a door
                $gameVariables[0].directionalAction = Game_Door.prototype.closeDoor;
                $gameVariables[0].directionalFlag = true;
                MapUtils.displayMessage('關哪個方向的門?');
                break;
            case 'i': // try to open inventory
                if (Object.keys($gameParty._items).length == 0 && Object.keys($gameParty._weapons).length == 0
                    && Object.keys($gameParty._armors).length == 0) {
                    MapUtils.displayMessage("你的身上沒有任何物品.");
                } else {
                    SceneManager.push(Scene_Item);
                }
                break;
            case 'W': case 'w': // open equipment window
                SceneManager.push(Scene_Equip);
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
    // InputUtils
    //
    // Deal with user-defined move actions

    InputUtils = function() {
        throw new Error('This is a static class');
    }

    InputUtils.checkKeyPressed = function() {
        if (Input.isTriggered('Numpad7')) {
            $gamePlayer.moveDiagonally(4, 8);
        } else if (Input.isTriggered('Numpad9')) {
            $gamePlayer.moveDiagonally(6, 8);
        } else if (Input.isTriggered('Numpad1')) {
            $gamePlayer.moveDiagonally(4, 2);
        } else if (Input.isTriggered('Numpad3')) {
            $gamePlayer.moveDiagonally(6, 2);
        }
    }

    //-----------------------------------------------------------------------------------
    // TimeUtils
    //
    // time system to update the whole world
    TimeUtils = function() {
        throw new Error('This is a static class');
    }

    TimeUtils.afterPlayerMoved = function() {
        $gameVariables[0].gameTime += $gameVariables[0].gameTimeAmp;
        // update all mobs & items
        for (var i = 0; i < $gameMap._events.length; i++) {
            if ($gameActors._data[1]._hp <= 0) {
                // player died, stop mob action
                break;
            }
            var event = $gameMap._events[i];
            if (!event || event._erased) {
                continue;
            }
            if (event instanceof Game_Mob) {
                event.action();
            }
        }
        // deal with energy calculation
        if (!playerAttacked && !playerMoved) {
            BattleUtils.playerUpdateTp(6);
        } else if (!playerAttacked) {
            BattleUtils.playerUpdateTp(3);
        }
        playerAttacked = false;
        playerMoved = false;

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

    //-----------------------------------------------------------------------------------
    // BattleUtils
    //
    // handles battle on map
    BattleUtils = function() {
        throw new Error('This is a static class');
    }

    BattleUtils.meleeAttack = function(src, target) {
        // TODO: need to implement attack damage formula
        var value = 10;
        var realTarget = (target == $gamePlayer) ? $gameActors._data[1] : target.mob;
        if (src == $gamePlayer && !BattleUtils.playerUpdateTp(-5)) {
            MapUtils.displayMessage('你氣喘吁吁, 沒有足夠的體力攻擊!');
            return;
        }
        $gameSystem.createPopup(0, "", "\\c[02]  -" + value, target);
        realTarget._hp -= value;
        // hit animation
        target.requestAnimation(16);
        if (realTarget._hp <= 0) {
            if (target == $gamePlayer) {
                // TODO: implement player dead mechanism
                MapUtils.displayMessage("\\N[1]不幸被殭屍咬死了...");
                SceneManager.goto(Scene_Gameover);
            } else {
                // remove target event from $dataMap.events
                // NOTE: Do not remove it from $gameMap._events! will cause crash
                $gameMap.eraseEvent(target._eventId);
                // move dead mobs so it won't block the door
                target.setPosition(-10, -10);
                $dataMap.events[target._eventId] = null;
            }
        }
        if (src == $gamePlayer) {
            playerAttacked = true;
            TimeUtils.afterPlayerMoved();
        }
    }

    // energy recovery
    BattleUtils.playerUpdateTp = function(value) {
        if (value > 0) {
            $gameActors._data[1]._tp = ($gameActors._data[1]._tp + value < 100) ? $gameActors._data[1]._tp + value : 100;
            return true;
        } else if ($gameActors._data[1]._tp + value >= 0) {
            $gameActors._data[1]._tp += value;
            return true;
        }
        return false;
    }

    //-----------------------------------------------------------------------------------
    // ItemUtils
    //
    // deal with item related methods
    ItemUtils = function() {
        throw new Error('This is a static class');
    }

    ItemUtils.findMapItemPile = function(x, y) {
        for (var i in $gameVariables[$gameMap.mapId()].itemPileList) {
            var candidate = $gameVariables[$gameMap.mapId()].itemPileList[i];
            if (candidate.x == x && candidate.y == y) {
                return candidate;
            }
        }
        return null;
    }

    // itemType 0: item, 1: weapon, 2: armor
    ItemUtils.addItemToMap = function(x, y, itemType, id) {
        var itemPile = ItemUtils.findMapItemPile(x, y);
        if (!itemPile) {
            itemPile = new ItemPile(x, y);
            $gameVariables[$gameMap.mapId()].itemPileList.push(itemPile);
        }
        switch (itemType) {
            case 0:
                itemPile.items[id] = (itemPile.items[id]) ? itemPile.items[id] + 1 : 1;
                break;
            case 1:
                itemPile.weapons[id] = (itemPile.weapons[id]) ? itemPile.weapons[id] + 1 : 1;
                break;
            case 2:
                itemPile.armors[id] = (itemPile.armors[id]) ? itemPile.armors[id] + 1 : 1;
                break;
            default:
                console.log("ItemUtils.addItemToMap ERROR: should not contain this type: %d", itemType);
        }
    }

    ItemUtils.addItemToSet = function(toAdd, itemSet, weaponSet, armorSet) {
        var id = toAdd.id;
        if (DataManager.isItem(toAdd)) {
            itemSet[id] = (itemSet[id]) ? itemSet[id] + 1 : 1;
        } else if (DataManager.isWeapon(toAdd)) {
            weaponSet[id] = (weaponSet[id]) ? weaponSet[id] + 1 : 1;
        } else if (DataManager.isArmor(toAdd)) {
            armorSet[id] = (armorSet[id]) ? armorSet[id] + 1 : 1;
        }
    }

    ItemUtils.checkAndRemoveEmptyItemPile = function() {
        for (var i in $gameVariables[$gameMap.mapId()].itemPileList) {
            var candidate = $gameVariables[$gameMap.mapId()].itemPileList[i];
            if (candidate.x == $gamePlayer._x && candidate.y == $gamePlayer._y) {
                if (Object.keys(candidate.items).length == 0 && Object.keys(candidate.weapons).length == 0
                    && Object.keys(candidate.armors).length == 0) {
                    $gameVariables[$gameMap.mapId()].itemPileList.splice(i, 1);
                    break;
                }
            }
        }
    }

    ItemUtils.addItemToItemPile = function(x, y, item) {
        var itemPile = ItemUtils.findMapItemPile(x, y);
        if (!itemPile) {
            itemPile = new ItemPile(x, y);
            $gameVariables[$gameMap.mapId()].itemPileList.push(itemPile);
        }
        ItemUtils.addItemToSet(item, itemPile.items, itemPile.weapons, itemPile.armors);
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

    Window_GetDropItemList.prototype.initialize = function(x, y, width, height) {
        Window_ItemList.prototype.initialize.call(this, x, y, width, height);
    };

    // always return true, because every item can be got/dropped
    Window_GetDropItemList.prototype.isEnabled = function(item) {
        return true;
    };

    //-----------------------------------------------------------------------------------
    // Scene_OnMapItem
    //
    // handle the action when trying to pick up item from the ground
    Scene_OnMapItem = function() {
        this.initialize.apply(this, arguments);
    }

    Scene_OnMapItem.prototype = Object.create(Scene_Item.prototype);
    Scene_OnMapItem.prototype.constructor = Scene_OnMapItem;

    Scene_OnMapItem.prototype.initialize = function() {
        Scene_Item.prototype.initialize.call(this);
        // indicates if player really moved
        this.moved = false;
        var itemPile = ItemUtils.findMapItemPile($gamePlayer._x, $gamePlayer._y);
        // modify $gameParty items, will change it back when scene closed
        this.tempItems = $gameParty._items;
        this.tempWeapons = $gameParty._weapons;
        this.tempArmors = $gameParty._armors;

        $gameParty._items = itemPile.items;
        $gameParty._weapons = itemPile.weapons;
        $gameParty._armors = itemPile.armors;
    };

    // override this function so it creates Window_GetDropItemList window
    Scene_OnMapItem.prototype.createItemWindow = function() {
        var wy = this._categoryWindow.y + this._categoryWindow.height;
        var wh = Graphics.boxHeight - wy;
        this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler('ok',     this.onItemOk.bind(this));
        this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
    };

    // override this, so we can change $gameParty items back when popScene
    Scene_OnMapItem.prototype.createCategoryWindow = function() {
        this._categoryWindow = new Window_ItemCategory();
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._helpWindow.drawTextEx('請選擇要撿起的物品.', 0, 0);
        this._categoryWindow.y = this._helpWindow.height;
        this._categoryWindow.setHandler('ok',     this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler('cancel', this.popSceneAndRestoreItems.bind(this));
        this.addWindow(this._categoryWindow);
    };

    // override this to show hint message
    Scene_OnMapItem.prototype.onItemCancel = function() {
        Scene_Item.prototype.onItemCancel.call(this);
        this._helpWindow.drawTextEx('請選擇要撿起的物品.', 0, 0);
    }

    Scene_OnMapItem.prototype.popSceneAndRestoreItems = function() {
        // restore $gameParty items
        $gameParty._items = this.tempItems;
        $gameParty._weapons = this.tempWeapons;
        $gameParty._armors = this.tempArmors;
        SceneManager.pop();
        if (this.moved) {
            setTimeout('TimeUtils.afterPlayerMoved();', 100);
        }
    }

    Scene_OnMapItem.prototype.onItemOk = function() {
        $gameParty.setLastItem(this.item());
        if (this.item()) {
            this.moved = true;
            // remove item from the ground
            $gameParty.loseItem(this.item(), 1);
            // setup item to 'temp', which means real $gameParty
            ItemUtils.addItemToSet(this.item(), this.tempItems, this.tempWeapons, this.tempArmors);
            // check if itemPile is empty
            ItemUtils.checkAndRemoveEmptyItemPile();
        }
        this._itemWindow.refresh();
        this._itemWindow.activate();
    };

    //-----------------------------------------------------------------------------------
    // Scene_DropItem
    //
    // handle the action when trying to drop items from player inventory
    Scene_DropItem = function() {
        this.initialize.apply(this, arguments);
    }

    Scene_DropItem.prototype = Object.create(Scene_Item.prototype);
    Scene_DropItem.prototype.constructor = Scene_DropItem;

    Scene_DropItem.prototype.initialize = function() {
        Scene_Item.prototype.initialize.call(this);
        // indicates if player really moved
        this.moved = false;
    };

    // override this function so it creates Window_GetDropItemList window
    Scene_DropItem.prototype.createItemWindow = function() {
        var wy = this._categoryWindow.y + this._categoryWindow.height;
        var wh = Graphics.boxHeight - wy;
        this._itemWindow = new Window_GetDropItemList(0, wy, Graphics.boxWidth, wh);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setHandler('ok',     this.onItemOk.bind(this));
        this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
        this.addWindow(this._itemWindow);
        this._categoryWindow.setItemWindow(this._itemWindow);
    };

    // override this to show hint message
    Scene_DropItem.prototype.createCategoryWindow = function() {
        this._categoryWindow = new Window_ItemCategory();
        this._categoryWindow.setHelpWindow(this._helpWindow);
        this._helpWindow.drawTextEx('請選擇要丟下的物品.', 0, 0);
        this._categoryWindow.y = this._helpWindow.height;
        this._categoryWindow.setHandler('ok',     this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    // override this to show hint message
    Scene_DropItem.prototype.onItemCancel = function() {
        Scene_Item.prototype.onItemCancel.call(this);
        this._helpWindow.drawTextEx('請選擇要丟下的物品.', 0, 0);
    }

    Scene_DropItem.prototype.onItemOk = function() {
        $gameParty.setLastItem(this.item());
        if (this.item()) {
            this.moved = true;
            // remove item from player inventory
            $gameParty.loseItem(this.item(), 1);
            // setup item to itemPile on the ground
            ItemUtils.addItemToItemPile($gamePlayer._x, $gamePlayer._y, this.item());
        }
        this._itemWindow.refresh();
        this._itemWindow.activate();
    };

    Scene_DropItem.prototype.popScene = function() {
        Scene_Item.prototype.popScene.call(this);
        if (this.moved) {
            setTimeout('TimeUtils.afterPlayerMoved();', 100);
        }
    }

    //-----------------------------------------------------------------------------------
    // Scene_Item
    //
    // override the useItem method, so it take turns
    Scene_Item.prototype.useItem = function() {
        Scene_ItemBase.prototype.useItem.call(this);
        SceneManager.goto(Scene_Map);
        setTimeout('TimeUtils.afterPlayerMoved();', 100);
    };
    
    //-----------------------------------------------------------------------------------
    // Game_BattlerBase
    //
    // override the param() method, so it can show our desired attributes
    Game_BattlerBase.prototype.param = function(paramId) {
        if (paramId < attributeNum) {
            var value = this.paramBase(paramId) + this.paramPlus(paramId);
            value *= this.paramRate(paramId) * this.paramBuffRate(paramId);
            var maxValue = this.paramMax(paramId);
            var minValue = this.paramMin(paramId);
            return Math.round(value.clamp(minValue, maxValue));
        } else {
            return this.xparam(paramId - attributeNum) * 100;
        }
    };
    
    //-----------------------------------------------------------------------------------
    // Window_Status
    //
    // override this to show our desired attributes name
    Window_Status.prototype.drawParameters = function(x, y) {
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
    
    Window_Status.prototype.refresh = function() {
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
    Window_EquipStatus.prototype.refresh = function() {
        this.contents.clear();
        if (this._actor) {
            this.drawActorName(this._actor, this.textPadding(), 0);
            for (var i = 0; i < attributeNum; i++) {
                this.drawItem(0, this.lineHeight() * (1 + i), 2 + i);
            }
        }
    };
    
    Window_EquipStatus.prototype.numVisibleRows = function() {
        return attributeNum + 1;
    };
    
    //-----------------------------------------------------------------------------------
    // Scene_Equip
    // 
    // override this to judge if player really changed equipment, then update time
    Scene_Equip.prototype.onItemOk = function() {
        SoundManager.playEquip();
        this.actor().changeEquip(this._slotWindow.index(), this._itemWindow.item());
        this._slotWindow.activate();
        this._slotWindow.refresh();
        this._itemWindow.deselect();
        this._itemWindow.refresh();
        this._statusWindow.refresh();
        SceneManager.goto(Scene_Map);
        setTimeout('TimeUtils.afterPlayerMoved();', 100);
    };

    Scene_Equip.prototype.commandOptimize = function() {
        SoundManager.playEquip();
        this.actor().optimizeEquipments();
        this._statusWindow.refresh();
        this._slotWindow.refresh();
        this._commandWindow.activate();
        SceneManager.goto(Scene_Map);
        setTimeout('TimeUtils.afterPlayerMoved();', 100);
    };

    Scene_Equip.prototype.commandClear = function() {
        SoundManager.playEquip();
        this.actor().clearEquipments();
        this._statusWindow.refresh();
        this._slotWindow.refresh();
        this._commandWindow.activate();
        SceneManager.goto(Scene_Map);
        setTimeout('TimeUtils.afterPlayerMoved();', 100);
    };
})();
