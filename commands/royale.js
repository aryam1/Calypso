const Discord = require('discord.js');
const royale = require('../royale.json')
const api = require('../api.js');
const db = require('../db.js');
const {branchData} = require('../config.json')
const {	SlashCommandBuilder } = require('@discordjs/builders');;
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder().setDescription('Get Royale Info').setDefaultPermission(false),
    async execute(interaction) {},
    fetch(){
        const start = new Date(2022,6,21);
        for (const memIndex in royale['Sovereign']){
            let mem = royale['Sovereign'][memIndex];
            const [type,id] = mem.d2.split('/')
            if (mem.chars.length == 0) continue
            for (const charIndex in mem.chars){
                const char = mem.chars[charIndex]
                let fetchMore = true;
                let page = 0;
                while (fetchMore) {
                    api.getActivities(type,id,char,null,page).then(acts=>{
                        if (acts == null) return null
                        console.log(acts[acts.length-1].period<start)
                    });
                    fetchMore = false;
                }
            }
        }
    },
	async setup(Guild) {
        const objStore ={};
        const dbInfo = {}
        const [discIds,userIds] = await db.getRegistered();
        discIds.map((item,index)=>{ dbInfo[item] = {"d2":userIds[index],"name":null, chars:null, count: 0} });
        for (let i in branchData){
            objStore[branchData[i].name] = {};
            const clan = await Guild.roles.fetch(branchData[i].roleId);
            let test = await clan.members.map(async mem=>{
                objStore[branchData[i].name][mem.id] = dbInfo[mem.id]
                objStore[branchData[i].name][mem.id].name = mem.nickname.replace(/(♧|♢|♤|♡|φ|☠|⚔|✮|§|,)+/g,'').trim();
                let [type,id] = dbInfo[mem.id].d2.split('/');
                objStore[branchData[i].name][mem.id].chars = Object.keys(await(api.getCharacters(type,id))||[]);;
            });
            await Promise.all(test)
        };
        fs.writeFileSync('./royale.json', JSON.stringify(objStore, null, 2), function writeJSON(err) {
            if (err) return console.log(err);
            console.log('writing to ./royale.json');
        });
    }
};