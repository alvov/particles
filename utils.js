(function(){

	'use strict';

	var PubSub = function(){
            var hash = {};
            this.subscribe = function(event, callback){
                if (!hash[event]) {
                    hash[event] = [];
                }
                hash[event].push(callback);
            };
            this.unsubscribe = function(event, callback){
                if (undefined === callback) {
                    hash[event] = [];
                } else if (hash[event]){
                    hash[event].forEach(function(value, i){
                        if (value === callback) {
                            hash[event].splice(i, 1);
                        }
                    });
                }
            };
            this.publish = function(event, data){
                if (hash[event]) {
                    hash[event].forEach(function(value){
                        value(data);
                    });
                }
            };
        },
        
        ObservableValue = function(value){
            var callbacks = [];
            return {
                value: value,
                set: function(value){
                    this.value = value;
                    callbacks.forEach(function(callback){
                        callback(this.value);
                    }.bind(this));
                },
                onChange: function(callback){
                    callback(this.value);
                    callbacks.push(callback);
                }
            }
        },
    
        utils = {
            extend: function(){
                var i = 0,
                    l = arguments.length,
                    result = arguments[0],
                    key;
                for (; ++i < l;) {
                    if (typeof arguments[i] === 'object') {
                        for (key in arguments[i]) {
                            if (arguments[i].hasOwnProperty(key)) {
                                result[key] = arguments[i][key];
                            }
                        }
                    }
                }
                return result;
            },
            random: {
                number: function(min, max){
                    min = undefined === min ? 0 : min;
                    max = undefined === max ? 1 : max;
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                },
                color: function(){
                    var color = [],
                        i = -1;
                    for (;++i < 3;) {
                        color.push(utils.random.number(0, 255));
                    }
                    return 'rgb(' + color.join() + ')';
                }
            },
            vectors: {
                add: function(v1, v2){
                    return v1.map(function(value, i){
                        return value + v2[i];
                    });
                },
                intersect: function(v1, v2){
                    return v1.reduce(function(prev, cur){
                        return prev || v2.indexOf(cur) !== -1;
                    }, false);
                }
            },
            round: function(value, precision){
                return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
            },
            pubsub: new PubSub(),
            angle: {
                PI: 3.1415,
                toRad: function(degrees){
                    return degrees * this.PI / 180;
                },
                toDeg: function(radians){
                    return radians * 180 / this.PI;
                }
            },
            observableValue: function(value){
                return new ObservableValue(value);
            }
        };

	if (!window.utils) {
		window.utils = utils;
	} else {
		throw 'Utils initialization namespace conflict';
	}

})();