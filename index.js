const Discord = require('discord.js');
const fetch = require('node-fetch');
const sqlite = require('sqlite3');
const config = require('./config.json');

const client = new Discord.Client();
const db = new sqlite.Database(config.database);
db.run('CREATE TABLE IF NOT EXISTS Words (word TEXT PRIMARY KEY, definition TEXT, submitterId CHAR(18))');

const API_BASE = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
const MERRIAM_BASE = "https://www.merriam-webster.com/dictionary/";
const SET_REGEX = /^(\S+)\smeans\s(.+)$/i;
const GET_REGEX = /^\bdefine\b:?\s?(\S+)$/i;

function buildCustomEmbed(entry) {
    const embed = new Discord.RichEmbed();
    const submitter = client.users.get(entry.submitterId);
    embed.description = entry.definition;
    if (submitter) {
        embed.author = {
            name: `Submitted by ${submitter.tag}`,
            icon_url: submitter.avatarURL,
        };
    } else {
        embed.author = {
            text: 'Submitted by unknown user.'
        }
    }
    return embed;
}

function buildEmbed(word, data) {
    const embed = new Discord.RichEmbed()
        .setTitle(word)
        .setURL(MERRIAM_BASE + word);
    
    // Empty response or array consists of suggestions
    if (data.length === 0 || typeof data[0] === "string") {
        embed.color = 0xff0000;
        embed.description = "No definitions.";
        return embed;
    }
    for (let result of data) {
        embed.addField(result.fl, result.shortdef.map((def, index) => `${index+1}. ${def}`).join('\n'));
    }
    return embed;
}

function getDefinitionEmbed(word) {
    return fetch(API_BASE + `${word}?key=${config.merriamWebsterKey}`)
        .then(res => res.json())
        .then(json => buildEmbed(word, json));
}

client.on('message', message => {
    if (GET_REGEX.test(message.content)) {
        const word = GET_REGEX.exec(message.content)[1];
        if (word) {
            db.get('SELECT definition, submitterId FROM Words WHERE word = ?', word, (err, row) => {
                if (err) return console.log(err);
                if (row) {
                    message.channel.send(buildCustomEmbed(row)).then(msg => {
                        msg.react("📖");
                        msg.awaitReactions((r, u) => r.emoji.name === "📖" && u.id === message.author.id, { time: 15000, max: 1 })
                            .then(reactions => reactions.array().length > 0 ? getDefinitionEmbed(word) : null)
                            .then(embed => {
                                if (!embed) {
                                    msg.clearReactions();
                                    return;
                                };
                                message.channel.send(embed)
                                msg.delete();
                            });
                    });
                    return;
                }
                getDefinitionEmbed(word).then(embed => message.channel.send(embed));
            });
        }
    } else if (SET_REGEX.test(message.content)) {
        const match = SET_REGEX.exec(message.content);
        db.get('SELECT * FROM Words WHERE Word = ?', match[1], (err, row) => {
            if (err) return console.log(err);
            if (row) {
                db.run('UPDATE Words SET definition = ?, submitterId = ? WHERE word = ?', match[2], message.author.id, match[1],
                (result, err) => {
                    if (err) return console.log(err);
                    message.react("✅");
                });
            } else {
                db.run('INSERT INTO Words (word, definition, submitterId) VALUES (?, ?, ?)', match[1], match[2], message.author.id,
                (result, err) => {
                    if (err) return console.log(err);
                    message.react("✅");
                });
            }
        });
    }
});

client.login(config.token);