const {	SlashCommandBuilder } = require('@discordjs/builders');
const { roles } = require('../config.json');
const fs = require('fs');
const info = require('../help/info.json')

// reads all the command filenames except this one
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js') && file != 'help.js').map(file=>file.split('.')[0]);

module.exports = {
	data: new SlashCommandBuilder().setDescription('Gives info on Caly commands ').setDefaultPermission(false).addStringOption(option =>{
        option.setName('command').setDescription('Choose command for info').setRequired(true);
        //option.addChoices({name:'All',value:'All'})
        // adds all command names as options
        commandFiles.map(cmd=>option.addChoices({name:cmd[0].toUpperCase() + cmd.slice(1),value:cmd}))
        return option
    }), 
	async execute(interaction) {
        // puts off replying to interaction then deletes original message
        interaction.deferReply().then(()=>interaction.deleteReply());
        const cmd = interaction.options.getString('command');
        if(cmd=='All'){
            // deletes all messages in channel
            interaction.channel.messages.fetch().then(msgs=>msgs.map(m=>m.delete()))
            // iterates through help info and sends data as embed using template
            for (let key in info){
                const template = {"color": 2067276,title:`How to use /${key}`,timestamp: new Date(), footer: {
                	icon_url: "https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg",text: "Calypso"}};
            	interaction.channel.send({embeds : [ {...template, ...info[key].embed } ] });
            }
        }
        else{
            // sends help info of specified command as embed
            const template = {"color": 2067276,title:`How to use /${cmd}`,timestamp: new Date(), footer: {
                icon_url: "https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg",text: "Calypso"}};
            interaction.channel.send({embeds : [ {...template, ...info[cmd].embed } ] });
        }
    },
};