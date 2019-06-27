// my plugin

(function() {
    MapData = function(floorId, original) {
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
    }
    
    MapVariable = function(mapData, rmDataMap) {
        this.mapData = mapData;
        this.rmDataMap = rmDataMap;
    }
    
    Coordinate = function(x, y) {
        this.x = x;
        this.y = y;
    }
    
    rawDataOld = [
        ['C','C','C','C','C'],
        ['C','W','F','F','C'],
        ['C','W','F','F','C'],
        ['C','W','F','F','C'],
        ['C','C','C','C','C']
    ];
    var FLOOR = '□';
    var CEILING = '■';
    var WALL = 'Ⅲ';
    
    var ceilingCenter = 5888;
    var wallCenter = 6282;
    var floorCenter = 2816;
    var warFogCenter = 3536;
    
    // view parameters
    var viewDistance = 5;
    
    MapUtils = function() {
        throw new Error('This is a static class');
    };
    
    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    };
    
    // this function should be called twice
    function updateVisible(x, y, mapData) {
        var visible = false;
        if (Math.abs($gamePlayer._x - x) <= viewDistance && Math.abs($gamePlayer._y - y) <= viewDistance) {
            // around player, check visibility
            visible = true;
            if ($gamePlayer._x != x) {
                var path = [];
                var m = ($gamePlayer._y - y) / ($gamePlayer._x - x);
                var startX, endX, lastY;
                if ($gamePlayer._x - x > 0) {
                    startX = x;
                    endX = $gamePlayer._x;
                    lastY = y;
                } else {
                    startX = $gamePlayer._x;
                    endX = x;
                    lastY = $gamePlayer._y;
                }

                // start to check if vision blocked
                for (var i = startX+1; i <= endX; i++) {
                    var estimatedY = Math.round(m * (i - $gamePlayer._x) + $gamePlayer._y);
                    
                    // fill y-axis coordinates
                    if (Math.abs(lastY - estimatedY) > 1) {
                        var startY = (lastY - estimatedY > 0) ? estimatedY : lastY;
                        var endY = (lastY - estimatedY > 0) ? lastY : estimatedY;
                        for (var j = startY+1; j < endY; j++) {
                            var estimatedX = Math.round((j - $gamePlayer._y) / m + $gamePlayer._x);
                            path.push(new Coordinate(estimatedX, j));
                        }
                    }
                    path.push(new Coordinate(i, estimatedY));
                    lastY = estimatedY;
                }
                
                for (var i = 0; i < path.length; i++) {
                    // does not count the (x, y) point
                    if (mapData[path[i].x][path[i].y].originalTile != FLOOR && !(path[i].x == x && path[i].y == y)) {
                        visible = false;
                        break;
                    }
                }
            } else {
                var start = ($gamePlayer._y - y > 0) ? y : $gamePlayer._y;
                var end = ($gamePlayer._y - y > 0) ? $gamePlayer._y : y;
                
                // start to check if vision blocked
                for (var i = start+1; i < end; i++) {
                    if (mapData[x][i].originalTile != FLOOR) {
                        visible = false;
                        break;
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
        var result = ceilingCenter;
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
                mapData[i][j] = new MapData(floorCenter, rawData[i][j]);
            }
        }
        
        // deal with tile IDs
        var north, south, east, west;
        for (var j = 0; j < rawData[0].length; j++) {
            for (var i = 0; i < rawData.length; i++) {
                if (rawData[i][j] == FLOOR) {
                    // deal with shadow
                    if (i-1 >= 0 && j-1 >= 0 && rawData[i][j] == FLOOR && rawData[i-1][j] != FLOOR && rawData[i-1][j-1] != FLOOR) {
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
                    var result = ceilingCenter;
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
                    mapData[i][j].base = result;
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
                }
            }
        }
        
        return mapData;
    };
    
    MapUtils.drawMap = function(mapData, mapArray) {
        for (var i = 0; i < mapArray.length; i++) {
            mapArray[i] = 0;
        }
        
        // first time update visibility
        for (var j = 0; j < mapData[0].length; j++) {
            for (var i = 0; i < mapData.length; i++) {
                updateVisible(i, j, mapData);
            }
        }
        
        var index = 0;
        var shadowOffset = mapData.length * mapData[0].length * 4;
        for (var j = 0; j < mapData[0].length; j++) {
            for (var i = 0; i < mapData.length; i++) {
                // second time update visibility
                updateVisible(i, j, mapData);
                if (mapData[i][j].isVisible || mapData[i][j].isExplored) {
                    mapArray[index] = mapData[i][j].base;
                    mapArray[shadowOffset + index] = mapData[i][j].shadow;
                    mapData[i][j].isExplored = true;
                }
                index++;
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
                
                var north;
                if (genMap[i][j].northWall) {
                    north = CEILING;
                } else {
                    north = FLOOR;
                }
                map[i * 2 + index][j * 2 + 1 + index] = north;
                
                var east;
                if (genMap[i][j].eastWall) {
                    east = CEILING;
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

    // cell definition
    function Cell(x, y) {
        this.x = x;
        this.y = y;
        this.northWall = true;
        this.eastWall = true;
        this.done = false;
    }

    function genMap(width, height) {
        // initialize
        var map = new Array(width);
        for (var i = 0; i < width; i++) {
            map[i] = new Array(height);
            for (var j = 0; j < height; j++) {
                map[i][j] = new Cell(i, j);
            }
        }
        
        // generate map
        var queue = [];
        var x = 0, y = 0;
        var xNext, yNext;
        queue.push(map[x][y]);
        while (queue.length > 0) {
            map[x][y].done = true;
            xNext = x, yNext = y;
            var direction = RNG[getRandomInt(24)];
            var moved = false;
            for (var i = 0; i < direction.length; i++) {
                switch (direction[i]) {
                    case 0: // east
                        if (x+1 < width && !map[x+1][y].done) {
                            map[x][y].eastWall = false;
                            xNext++;
                        }
                        break;
                    case 1: // north
                        if (y+1 < height && !map[x][y+1].done) {
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
        return map;
    }
    
    MapUtils.generateMapData = function(width, height) {
        var mapRaw = genMap(width, height);
        var mapPixel = genMapToMap(mapRaw);
        return addWall(mapPixel);
    }
    
    // override map loading mechanism
    DataManager.isMapLoaded = function() {
        if ($gameMap && $gameMap.mapId() > 0) {
            if ($dataMap && !$gameVariables[$gameMap.mapId()]) {
                // first load map
                console.log("first load map: " + $gameMap.mapId());
                var rawMap = MapUtils.generateMapData(30, 20)
                var newMapData = MapUtils.translateMap(rawMap);
                $dataMap.width = rawMap.length;
                $dataMap.height = rawMap[0].length;
                $dataMap.data = new Array(newMapData.length * newMapData[0].length * 6);
                MapUtils.drawMap(newMapData, $dataMap.data);
                $gameVariables[$gameMap.mapId()] = new MapVariable(newMapData, $dataMap);
            } else if ($dataMap && $gameVariables[$gameMap.mapId()]) {
                // assign map data here
                console.log("assign map data.");
                $dataMap = $gameVariables[$gameMap.mapId()].rmDataMap;
                MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
            }
        }
        this.checkError();
        return !!$dataMap;
    };
    
    // handle map change when player moved
    Game_Player.prototype.moveStraight = function(d) {
        var moved = false;
        if (this.canPass(this.x, this.y, d)) {
            this._followers.updateMove();
            moved = true;
        }
        Game_Character.prototype.moveStraight.call(this, d);
        if (moved) {
            MapUtils.drawMap($gameVariables[$gameMap.mapId()].mapData, $dataMap.data);
            // add for steam RMMV project
            setTimeout('SceneManager.goto(Scene_Map)', 250);
        }
    };

    Game_Player.prototype.moveDiagonally = function(horz, vert) {
        if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
            this._followers.updateMove();
            // put operations here
        }
        Game_Character.prototype.moveDiagonally.call(this, horz, vert);
    };
})();