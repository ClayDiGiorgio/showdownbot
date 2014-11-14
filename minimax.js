// Logging
var log4js = require('log4js');
var logger = require('log4js').getLogger("minimax");
log4js.addAppender(log4js.appenders.file('logs/minimax.log'), 'minimax');

require('sugar')

var _ = require("underscore");
var clone = require("clone");

var toChoiceString = module.exports.toChoiceString = function (choice) {
    if(choice.type == "move") {
        return "move " + choice.id;
    } else if(choice.type == "switch") {
        return "switch " + (choice.id + 1);
    }
}

function getFeatures(battle) {
	features = {};

	var currentPokemon = battle.p1.active[0];
	features.currentPokemonHP = currentPokemon.hp;

	var oppPokemon = battle.p2.active[0];
	features.oppPokemonHP = oppPokemon.hp;

	return features;
}

function eval(battle) {
	var features = getFeatures(battle);
	var value = -features.oppPokemonHP;
	logger.trace(JSON.stringify(features) + ": " + value);
	return value;
}

var decide = module.exports.decide = function(battle, choices) {
	try {
		var MAX_DEPTH = 1;
		var choice = playerTurn(battle, MAX_DEPTH, choices);
		if(!choice) logger.error("Minimax did not return choice.");
		else return choice;
	} catch (e) {
		logger.error(e);
	}

	logger.debug("Picking random move");
	return _.shuffle(choices)[0];
}

//Manually clones a battle object.
function battleClone(battle) {
    newBattle = Battle.construct(battle.roomid, 'base', false);
    newBattle.join('p1', 'botPlayer');
    newBattle.join('p2', 'humanPlayer');

    //collect pokemon data
    newBattle.p1.pokemon = [];
    for(var i in battle.p1.pokemon) {
        var newPokemon = new BattlePokemon(battle.p1.pokemon[i].set, newBattle.p1);
        if(battle.p1.active[0] === battle.p1.pokemon[i]) {
            newPokemon.isActive = true;
            newBattle.p1.active = [newPokemon];
        }
        newBattle.p1.pokemon.push(newPokemon);
    }

    newBattle.p2.pokemon = [];
    for(var i in battle.p2.pokemon) {
        var newPokemon = new BattlePokemon(battle.p2.pokemon[i].set, newBattle.p2);
        if(battle.p2.active[0] === battle.p2.pokemon[i]) {
            newPokemon.isActive = true;
            newBattle.p2.active = [newPokemon];
        }
        newBattle.p2.pokemon.push(newPokemon);
    }
    logger.trace("Finished cloning battle");
    return newBattle;
}

function playerTurn(battle, depth, givenchoices) {
	logger.trace("Player turn at depth " + depth);

	if(depth == 0) return eval(battle);

	var max_value = Number.NEGATIVE_INFINITY;
	var max_action = null;

	var choices = undefined;
	if(givenchoices) choices = givenchoices;
	else {
		// TODO: Find choices
		choices = [];
	}

	for(var i = 0; i < choices.length; ++i) {
		logger.trace("Cloning battle...");

		// Register action
		var value = opponentTurn(battle, depth, choices[i]);
		if(value > max_value) {
			max_value = value;
			max_action = choices[i];
		}
	}

	if(givenchoices) return max_action;
	else return max_value;
}

function opponentTurn(battle, depth, playerAction) {
	logger.trace("Opponent turn turn at depth " + depth);

	var min_value = Number.POSITIVE_INFINITY;
	var min_action = null;

	var choices = [];
	var pokemon = battle.p2.active[0];
	_.each(pokemon.getMoves(), function(move) {
		choices.push({
			"type" : "move",
			"id" : move.id
		});
	});

	// TODO: Find switching options

	for(var i = 0; i < choices.length; ++i) {
		logger.trace("Cloning battle...");
		var newbattle = battleClone(battle);

		// Register action
		newbattle.choose('p1', toChoiceString(playerAction), newbattle.rqid)
		newbattle.choose('p2', toChoiceString(choices[i]), newbattle.rqid)
		var value = playerTurn(newbattle, depth - 1);

		if(value < min_value) {
			min_value = value;
			min_action = choices[i];
		}
	}

	return min_value;
}
