const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const api = require('../api.js');
const {roles,branchData} = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Checks Sov members who haven\'t done PvE with the clan in 2 weeks').setDefaultPermission(false),
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();        
        let finalEmbed = new Discord.MessageEmbed().setColor('RED').setTitle('Members who don\'t meet the PvE requirement');
        const allNames = [];
        let sovMembers = [];
        let noAct = [];
        let noClan = [];
        console.log('Fetching all members\' names');
        for (let i in branchData){
            const clanMembers = await api.getClanMembers(branchData[i].groupId);
            if (i == 'sm') sovMembers = clanMembers;
            await clanMembers.map(mem=>{
                allNames.push((mem.destinyUserInfo.bungieGlobalDisplayName ?mem.destinyUserInfo.bungieGlobalDisplayName :
                               mem.destinyUserInfo.displayName).substr(0,30));
            });
        }
        for (let i = 0; i<sovMembers.length; i++){
            const mem = sovMembers[i];            
            const rr = `<https://raid.report/${['xb','ps','pc'][mem.destinyUserInfo.membershipType-1]}/${mem.destinyUserInfo.membershipId}>`;
            const memName = (mem.destinyUserInfo.bungieGlobalDisplayName? mem.destinyUserInfo.bungieGlobalDisplayName:mem.destinyUserInfo.displayName).substr(0,30);
            let chars = Object.keys(await api.getCharacters(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId));
            if (chars.length == 0) continue
            let totalActs = chars.map(async char=>{
                let raids = await api.getActivities(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId,char,4,0,50);
                let duns = await api.getActivities(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId,char,82,0,100);
                let acts = [...raids||[], ...duns||[]];
                return (acts == null) ? [] : (acts?.filter(act=>new Date(act.period) > (new Date()/(86400000)-14)))?.map(act=>act.activityDetails.instanceId); 
            });
            totalActs = (await Promise.all(totalActs)).flat()
            if (totalActs.length<2){
                noAct.push(`[${memName}](${rr})`);
                continue;
            }
            Promise.all(totalActs.map(async act=>{
                let names = (await api.getActivityReport(act))?.reduce((total,current)=>{
                    if (current.player.destinyUserInfo.membershipType==0) return total
                    let name = (current.player.destinyUserInfo.bungieGlobalDisplayName ? current.player.destinyUserInfo.bungieGlobalDisplayName :
                                current.player.destinyUserInfo.displayName).substr(0,30);
                    return (allNames.includes(name)) ? [...total,name] : total;
                },[]);
                //if (["4611686018507308128",].includes(mem.destinyUserInfo.membershipId)) {console.log(names)}
                return (names?.length>1) ? true:false;
            })).then(values=> {if (values.filter(Boolean).length<2) noClan.push(`[${memName}](${rr})`)});
        };
        console.log(noAct.length +" Members haven't done PvE in the past 2 weeks")
        
        noClan = noClan.reduce((total,current)=>`${total}\n${current},`,'')
        noAct = noAct.reduce((total,current)=>`${total}\n${current},`,'')
        
        finalEmbed.addField('2 Raids/Dungeons Not Done with Clan Members in Past 2 Weeks',noClan,true)
        finalEmbed.addField('2 Raids/Dungeons Not Done in Past 2 Weeks',noAct,true)
        await interaction.editReply({embeds:[finalEmbed]})
    },
};