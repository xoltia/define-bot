const Discord = require('discord.js');
const fetch = require('node-fetch');
const config = require('./config.json');

const client = new Discord.Client();
const API_URL = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
const MERRIAM_BASE = "https://www.merriam-webster.com/dictionary/";

function buildEmbed(word, data) {
    const embed = new Discord.RichEmbed()
        .setTitle(word)
        .setURL(MERRIAM_BASE + word);
    if (data.length == 0) {
        embed.color = 0xff0000;
        embed.description = "No definitions.";
    }
    for (let result of data) {
        embed.addField(result.fl, result.shortdef.map((def, index) => `${index+1}. ${def}`).join('\n'));
    }
    return embed;
}

client.on('message', message => {
    if (message.content.toLowerCase().startsWith('define')) {
        const word = message.content.substr(6).trim().split(" ")[0];
        if (word) {
            fetch(API_URL + `${word}?key=${config.merriamWebsterKey}`)
                .then(res => res.json())
                .then(json => message.channel.send(buildEmbed(word, json)));
        }
    }
});

client.login(config.token);