const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const {token} = require('./token.json')
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const db = require('./db.js');
const api = require('./api.js');

module.exports = {
    // Identify branch
    getBranch: function(member) {
        let branch;
        // iterates through branches to find which branch the member has
        Object.keys(config.branchData).forEach(b => { if (member._roles.includes(config.branchData[b].roleId)) branch = config.branchData[b] })
        return branch;
    },
    
     // Formats username as Bungie name
    validateName: async function(member,full = true,fetch=false) {
        let name='';
        let branchSym;
        let sym='';
        let symbols='';
        let error=false;
        // sets id variable depending on what arguments were passed to the function
        let id = fetch? member:member.user.id
        const user = await db.fetchMember(id).catch(err=>error = true);
        // breaks if there's no db info
        if (error) return null
        try {
            // fetches bungie information
            const finalName = await api.getProfile(user[0],user[1]).then(async prof=>{
                // gets bungie name if they have one and trims it to 30 characters
                name = (prof.bungieGlobalDisplayName ? prof.bungieGlobalDisplayName : prof.displayName).substr(0,30);
                // returns the trimmed name if the function was called without the extra symbols needed
                if (!full) return name
                // gets branch symbol for member
                branchSym = this.getBranch(member).symbol;
                // gets prestige symbols for member
                sym = await sym.concat(member._roles.includes(config.roles.skulls) ? '☠':'');
                sym = await sym.concat(member._roles.includes(config.roles.swords) ? '⚔':'');
                sym = await sym.concat(member._roles.includes(config.roles.snakes) ? '§':'');
                // replaces branch symbol with prestige symbols
                symbols = ((sym=='') ?  (branchSym?branchSym:'!') : sym);
                // gets all their valid hof records 
                let records = await db.recordsGet(member.user.id);
                // allocates 1-3 stars depending on how many records they have
                if (records>0) symbols = symbols.concat("✮".repeat(Math.floor((records)/5)+1).substr(0,3));
                if (records>12) console.log(`${name} is a HoF God`);
                return name.concat(' ',symbols)
            });
            return finalName
        }
        catch{ console.log("validateName issue " + member)}
    },
    
    // sets up the commands in the discord api
    commandRegister: function(guild) {
    	const commands = [];
        const commandPerms ={};
        // finds all the command files
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
		const clientId = '878968640957972490';
		const guildId = '232961095571210251';
		// imports the files and pushes all the data to an array
		for (const file of commandFiles) {
			const command = require(`./commands/${file}`);
            command.data.name = file.slice(0,-3);
			commands.push(command.data.toJSON());
		};
        // establishes a connection with the API
		const rest = new REST({ version: '10' }).setToken(token);
		(async () => {
			try {
				console.log('Started refreshing application (/) commands.');
                // pushes all the commands to the API
				let allCommands = await rest.put(Routes.applicationGuildCommands(clientId, guildId),{ body: commands });
                console.log('Successfully reloaded application (/) commands.');
			} 
            catch (error) {console.error(error)}
		})();
    },
    
    // logs all messages in a tracking channel
    logMessage: function(message, channel, guild) {
        try {
            const member = guild.members.cache.get(message.author.id);
            channel.send({ content: `**${member.nickname}** in ${message.channel}: ${message.content.substring(0,1000)}`, allowedMentions: {"parse": []}});
        }
        catch (error) {console.log(error)}
    },
    
    // increases or decreases the record count for a member
    changeStars: function(mode,members,interaction){
        members.map(async mem=>{
            await db.recordsChange(mem,mode?'+':'-');
            //let user = await interaction.guild.members.fetch(mem).catch(err=>console.log(err,mem));
        })
    },
    
    // complex deprecated auto activity system 
    checkActivity : async function(guild) {
        // fetches the activity channel and the messages in it
        const actChan = await guild.channels.fetch('938812693794676777');
        const chan2 = await guild.channels.fetch('753020461008420954');
        const currentMsgs = (await actChan.messages.fetch()).filter(m=>m.type == 'DEFAULT');
        let finalData = new Map();
        // fetches old activity threads and on leave thread
        const [activities,leave] = (await actChan.threads.fetchArchived()).threads.partition(t=>/\d+/.test(t.name));
        if (currentMsgs.size>0) {
            // puts the current messages in the channel into a new thread to archive the data
            actChan.threads.create({
                name: new Date(currentMsgs.last().createdTimestamp).toLocaleDateString('et-EE'),
                autoArchiveDuration: 60,
                reason: 'Archiving old activity data',              
            }).then(thread=>{
                thread.setArchived(true);
                currentMsgs.map(e=>thread.send({embeds : e.embeds}))
            }).then(_=>{ currentMsgs.map(m=>m.delete()) })
        };
        // gets all members
        let clan = await db.fetchAll();
        const currentDate = new Date();
        const actRe = new RegExp(/(\d{1,5})/g);
        // transforms array of objects to normal object with discord id as key
        clan = clan.reduce((result,data)=>{result[data.Discord]=[data.UserInfo,data.DiscAct,data.ActCount]; return result},{});  
        for (let i of Object.values(config.branchData)) {
            let list = await guild.roles.fetch(i.roleId);
            const fails = 0;
            // for each member in a branch
            const proms = list.members.map(async m=>
            {
                // gets their db info
                const data = clan[m.user.id];
                const [membershipType,membershipId] = data[0].split('/');
                // gets their ingame info
                const request = await api.getProfile(membershipType,membershipId);
                // calculate days since played and days since interacted in Discord
                const lastPlayed = Math.ceil(Math.abs(new Date(request.dateLastPlayed) - currentDate) / (1000 * 60 * 60 * 24));
                const lastInteracted = Math.ceil(Math.abs(data[1] - currentDate) / (1000 * 60 * 60 * 24));
                // returns all the relevant data
                return [m.nickname.replace(/ (♧|♢|♤|♡|☠|⚔|✮)+/,''),lastPlayed, lastInteracted, data[2], m.user.id];
            });
            // waits for all data to be gethered and sorts by Discord activity
            let info = (await Promise.allSettled(proms)).sort((a,b) => a.value[3] - b.value[3]);
            const clanEmbed = new Discord.MessageEmbed().setColor('RED').setTimestamp();
            // formats text for each member based on their inactivity and sets up DM
            info = info.map(rec=>{
                let outStr, dm;
                if (rec.status === 'rejected') {fails +=1; return null};
                // if inactive in both game and discord
                if (rec.value[1]>config.activity && rec.value[2]>config.activity){
                    outStr = `**${rec.value[0]}: ${rec.value[1]}, ${rec.value[2]}**, ${rec.value[3]}`;
                    dm = '';
                }
                // inactive only in game
                else if (rec.value[1]>config.activity){
                    outStr = `**${rec.value[0]}: ${rec.value[1]}**, ${rec.value[2]}, ${rec.value[3]}`;
                    dm = '';
                }
                // inactive only in discord
                else if (rec.value[2]>config.activity){
                    outStr = `**${rec.value[0]}**: ${rec.value[1]}, **${rec.value[2]}**, ${rec.value[3]}`;
                    dm='';
                }
                // not inactive
                else {
                    return `${rec.value[0]}: ${rec.value[1]}, ${rec.value[2]}, ${rec.value[3]}`
                }
                if(!!dm) console.log('send message')
                return outStr;
            });
            // sets up other embed details
            clanEmbed.setFooter({text:`Unable to find ${fails} players\' data.`});
            clanEmbed.setTitle(i.name + " Members");
            clanEmbed.setDescription("**Destiny (days), Discord (days), Counter, Messaged:**\n"+info.join('\n'));
            //console.log("**Member,  Destiny (days),  Discord (days),  Activity Count:**\n"+info.join('\n'))
            //actChan.send({embeds:[clanEmbed]})

            //finalData[i.name]=list.members.reduce((result,data)=>{result[data.user.id]=clan[data.user.id]; return result},{});
        }
	},
    
    // updates the calendar
    calendar: async function(guild) {
        // gets channel and messages in channel
        const calChan = await guild.channels.fetch("940188237958381638");
        const col = await calChan.messages.fetch();
        // deletes all messages not sent by a bot
        const [msg,other] = col.partition(u=>u.author.bot);
        calChan.bulkDelete(other);
        // gets all calendar events
        const events = await db.calendarGet();
        // sets up embed and adds events as fields
        let finalEmbed = new Discord.MessageEmbed().setColor('BLUE').setTitle('Clan Event Calendar');
        events.map(e=> finalEmbed.addField(e.Event,`<t:${(new Date(e.Time)).getTime()/1000}:F>`))
        // if no calendar message exists, send one
        if (msg.size==0) {calChan.send({embeds:[finalEmbed]});return null}
        // if old calendar is not the same as new calendar, delete old and send new
        if (JSON.stringify(msg.first().embeds[0].fields) !== JSON.stringify(finalEmbed.fields)) { calChan.bulkDelete(msg); calChan.send({embeds:[finalEmbed]}) }
    }
};