const Discord = require('discord.js');
const config = require('./config.json')

const client = new Discord.Client();

client.on('message', message => {

});

client.login(config.token);