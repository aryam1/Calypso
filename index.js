const { version,roles,activity} = require('./config.json');
const {token} = require('./token.json')
const Discord = require('discord.js');
const fs = require('fs');
const utils = require('./utils.js');
const db = require('./db.js');
const cron = require('node-cron');
const schedule_logic = require('./schedule_logic.js');
const api = require('./api.js')

// set constructor variables
const Client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_BANS, Discord.Intents.FLAGS.GUILD_INTEGRATIONS, Discord.Intents.FLAGS.GUILD_VOICE_STATES, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Discord.Intents.FLAGS.DIRECT_MESSAGES],
    partials: ["CHANNEL"],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
});

Client.commands = new Discord.Collection();

// Logs the bot in
Client.login(token);

// bot startup procedure
Client.on('ready', async () => {
    console.log('Bot Started');
    console.log('Version ' + version);
    console.log('Date ' + Date());
	
    // connects the db
	db.init();
    
    Client.user.setPresence({activities: [{name: 'for help (DM ME)', type: 'WATCHING'}]});
    if (!Client.application?.owner) await Client.application?.fetch();
    const madnessGuild = Client.guilds.cache.get('232961095571210251');
    
    // caches server members
    const members = await madnessGuild.members.fetch();
    
    // get the command folder and set the files as commands
	await utils.commandRegister(madnessGuild);
    const now = new Date();
    // Fetches Group Recruitment messages
    madnessGuild.channels.fetch('528308653883916308').then(chan=>chan.messages.fetch())

    madnessGuild.roles.fetch('964927284136001556').then(r=>r.members.map(m=>m.roles.add(['695064064338034738','769250499349577798'])))
    
    madnessGuild.roles.fetch(roles.voracious).then(r=>r.members.map(m=>m.roles.add('945653961229217834')))
    
    // bidaily schedule update
    cron.schedule('0 0,12 * * *', ()=> schedule_logic.daily(madnessGuild))
    
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Daily Tasks')
        const now = new Date();
        
        // updates the calendar
        utils.calendar(madnessGuild);
        
        // kicks all members who've been in the server for 2 days without joining a branch
        let unassigned = await madnessGuild.roles.fetch(roles.unassigned);
        for (const i of unassigned.members.values()) { if (((now.getTime()-i.joinedTimestamp)/(1000*60*60))>24) i.kick() }
        
        // kicks level 1s every activity check period if they've been around for a month
        const daysIntoYear = ((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000)
        console.log('Running Activity Checks');
        const paranoids = await madnessGuild.roles.fetch(roles.paranoid);
        let counter = 0;
        paranoids.members.map(m=>{
            if (((now.getTime()-m.joinedTimestamp)/(1000*60*60*24))>31) {
                counter += 1;
                m.kick();
            }
        })
        console.log(`${counter} Level 1s Kicked`)
    });
    
    // fetches command files and stores command data in a dictionary variable of Client
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
    	const command = require(`./commands/${file}`);
    	await Client.commands.set(command.data.name, command);
    }
});

// interaction event handler
Client.on('interactionCreate', async interaction => {
    let data = [interaction.user.id];
    if (interaction.isCommand()){
        data.push(interaction.commandName,"Slash",null,null)
        // fetches the command info from the command dictionary and executes it
        const command = Client.commands.get(interaction.commandName);
        console.log(`${interaction.user.username} used /${interaction.commandName}`)
        try {await command.execute(interaction)}
        catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        };
    }
    else if(interaction.isButton()){
        // splits the button identifier to find which command it's assocaited with and then executes the button handler in that command file
        if (interaction.customId.includes('-')){
            const command = await Client.commands.get(interaction.customId.split('-')[0]);
            console.log(`${interaction.user.username} used a ${command.data.name} button`)
            data.push(command.data.name,"Button", null, null)
            try{await command?.buttonHandle(interaction)}
            catch (error) {console.error(error)}
        }
        else{
            // if the button isn't associated with a file, it handles the custom execution here
            switch(interaction.customId) {
                case "delete":
                    data.push("Delete","Button", null, null)    
                    // deletes message attached to button
                    interaction.message.delete(); 
                    console.log(`${interaction.user.username} deleted something`);
                    break;
                case "boost":
                    data.push("Boost","Button", null, null)
                    const guild = Client.guilds.cache.get('232961095571210251');
                    // gives pink role
                    await guild.members.fetch(interaction.user.id).then(member=>member.roles.add("845990426901086209"))
                    interaction.deferUpdate()
                    break;
            }
        }
    }

    else if (interaction.isSelectMenu()){
        // splits the select identifier to find which command it's assocaited with and then executes the select handler in that command file
        const command = await Client.commands.get(interaction.customId.split('-')[0]);
        console.log(`${interaction.user.username} used a ${command?.data.name} menu`)
        try{
            await command.selectHandle(interaction)
        	data.push(command.data.name,"Select",null , null)
        }
        catch (error) {console.error(error)}
    }
    await db.addUse(data)
});

//handles all sent messages
Client.on('messageCreate', async messageSent => {
    if (messageSent.author.bot){
        if (messageSent.author.id == '542669269922480138') {console.log('Percy a Bitch');messageSent.delete()};
        return
    }
    //get madnessGuild id
    const madnessGuild = Client.guilds.cache.get('232961095571210251');
    //Handles replies to DMs
    if (messageSent.guildId == null) {
        //get fromClanmates channel ID and user id
        const fromClanmates = madnessGuild.channels.cache.get('784289143324672020');
        const member = madnessGuild.members.cache.get(messageSent.author.id);
        const minLimit = 10;

        //logs the message being sent to Calypso
        console.log('\nDM to Calypo: ' + messageSent.author.username + ' at ' + messageSent.createdAt + ':');
        console.log(messageSent.content + '\n');

        //checks if message is shorter than the limit
        if (messageSent.content.length < minLimit) {
            messageSent.author.send('Hi <@'+messageSent.author.id+'>,\r'+'This message is under '+minLimit+" characters, so I've not passed it along to staff.\r");
            return;
        }
        // gets branch of member sending dm
        const memberBranch = utils.getBranch(member);
        const memberBranchRole = memberBranch !== null ? memberBranch.roleId : roles.unassigned;


        //make an embedded msg and send it
        const dmMessageEmbed = new Discord.MessageEmbed()
            .setColor('#E67E22').setTitle(`Message from ${madnessGuild.members.cache.get(messageSent.author.id).nickname}`).setDescription(messageSent.content)
            .addFields({
                name: 'Player',
                value: `<@${messageSent.author.id}>`
            }, {
                name: 'Branch',
                value: `<@&${memberBranchRole}>`
            })
            .setTimestamp().setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});

        fromClanmates.send({ content: `<@&${memberBranchRole}>`, embeds: [dmMessageEmbed] });

        //let the author of the dm know the message has been forwarded
        messageSent.author.send(
            'Hi <@' +
            messageSent.author.id +
            '>, thanks for messaging me!\r' +
            'Your comment has been forwarded to staff.\r' +
            'If necessary, we will get back to you as soon as possible.'
        );
    } else {
        // handles normal message tracking
        
        // if it's a group recruitment message pinging raid and has the word react in
        if (messageSent.content.includes('<@&530098202117013515>') && messageSent.content.includes('react')){
            // dms author of message with an embed to track the reacts on their post
            const dm = await messageSent.author.createDM();
            const embd = new Discord.MessageEmbed().setColor('GREEN').setTitle("Reacts on your post").setDescription('-------------------------');
            dm.send({ embeds :[embd]})
        }
        // if it doesn't start with / and not from certain channels then it tracks it  
        if (!messageSent.content.startsWith('/') && !['507469291566792705', '507469230682275841', '248965384747745281'].includes(messageSent.channel.id)) {
            //updates activity
            db.updateActivity(messageSent.author.id);    
            //logs message in #text-tracking
            const textTrackingChannel = madnessGuild.channels.cache.get('789226475575705610');
            return utils.logMessage(messageSent, textTrackingChannel, madnessGuild);
        }
    };
});

// Reaction trackning for raid posts in group recruitement
Client.on("messageReactionAdd", async function(messageReaction, user){
    // if message has @raid and it's not older than a day
    if (messageReaction.message.content.includes('<@&530098202117013515>') && Date.now()-messageReaction.message.createdTimestamp<(1000*60*60*24)){
        // create dm or get reference to existing dm
        const dm = await messageReaction.message.author.createDM();
        
        const reactor = user.username;
        // find message sent to host roughly at the same time as when the sent the message in group recruitment
        const dmMsg = (await dm.messages.fetch()).filter(msg=>((msg.createdTimestamp-1000) < messageReaction.message.createdTimestamp  && messageReaction.message.createdTimestamp < (msg.createdTimestamp+1000)));
        if(dmMsg.size){
            // add name of reactor to the embed
            const embd = dmMsg.first().embeds[0];
            embd.setDescription(embd.description+'\n'+reactor);
            dmMsg.first().edit({embeds:[embd]})
        }
    };
});

//handles any new guild member
Client.on('guildMemberAdd', member => {
    console.log('Member joined guild "' + member.user.username + '"');
    // fetches new member channel
    let channelForMessage = member.guild.channels.cache.get('507476891741978644');

    const newMemberEmbed = new Discord.MessageEmbed()
    .setColor('GREEN').setTitle('New Member Joined').setTimestamp()
    .setDescription(`Welcome <@${member.user.id}> to **Madness Hub**, home to all the Madness clans!\r
			__You will be able to see all channels once you are in the clan in game and have a role assigned.__\n
			**Upon joining our server, please state and do the following:**\r
			:small_blue_diamond: Your bungie.net URL.\r
			:small_blue_diamond: Which branch you\'re applying for. If you\'re unsure, ask for a list.\r
			:small_blue_diamond: Hit \"join clan\" on the page so we can easily accept you into the clan.\n
			Additional:\r
			:small_red_triangle_down: Not sure about joining our clan, or just here for a raid or mission? Request a temporary Guest role to check us out!\r`)
    .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});

    try {
        // ping relevant people then delete it then send welcome message
        channelForMessage
            .send(`<@&${roles.recruiter}> <@&${roles.moderator}> <@${member.user.id}>`)
            .then(welcomeMessage => {welcomeMessage.delete();channelForMessage.send({embeds: [newMemberEmbed]})});
    } catch (error) {
        console.log(error)
    };
});

// handles when a member has any in server changes 
Client.on("guildMemberUpdate", function(oldMember, newMember){
    // if they've boosted or removed their boos
    if (oldMember.premiumSinceTimestamp == null || newMember.premiumSinceTimestamp == null) {
        // remove pink role if they removed boost
        if (newMember.premiumSinceTimestamp == null) {newMember.roles.remove("845990426901086209")}
        else {
            // send message asking if they want pink role for boosting
            const row = (new Discord.MessageActionRow())
            .addComponents(new Discord.MessageButton().setStyle('PRIMARY').setCustomId('boost').setEmoji('306850782278451201'));
            newMember.send({content: "Thank you for boosting the server, if you want a pink name to show your contribution click the button below, if you want it removed later then just drop a message in <#803654685553721404>", components: [row]});
        }
    }
});


// tracks any guild member who has been kicked or left
Client.on('guildMemberRemove', async member => {
    console.log('Member left guild: "' + member.user.username + '"');
    // fetches new member chat, finds their welcome message and edits it to show "left" if found
    let newM = await member.guild.channels.fetch('507476891741978644');
    const welcome = (await newM.messages.fetch({limit : 100})).filter(m=>m.embeds[0]?.description?.includes(member.user.id));
    if (welcome.size) welcome.first().edit({ embeds : [new Discord.MessageEmbed().setColor('RED').setTitle('Member Left')]})

    let channelForMessage = member.guild.channels.cache.get('508115830391832586');
	//collects the join information
    const dateJoinedFormatted = (`<t:${member.joinedTimestamp/1000 | 0}:F>`);
    // Get name
    const memberNickname = member.nickname !== null ? member.nickname : member.user.username;

    //makes the leave tracking message
    const embeddedMessage = new Discord.MessageEmbed()
    .setColor('RED').setTitle(`${memberNickname} has left the server`).setTimestamp()
    .setDescription(`**Member left:**\r\n${member.user.username}#${member.user.discriminator} (ID): ${member.user.id}\n\n**Join date:** ${dateJoinedFormatted}\n`)
    .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});

    // removed them and all hof records with them in from db
    db.deleteMember(member.user.id);
    db.hofDeleteUser(member.user.id);
    channelForMessage.send({ embeds: [embeddedMessage] });
});

// handles when members are banned
Client.on('guildBanAdd', member => {
    console.log('Member banned from guild: "' + member.user.username + '"');
    let channelForMessage = member.guild.channels.cache.get('509624891260010496');
    //makes the ban tracking message
    const embeddedMessage = new Discord.MessageEmbed().setColor('RED').setTitle(`${member.user.username} has been blacklisted`)
    .setDescription(`**Member Banned:**\r\n${member.user.username}#${member.user.discriminator} (ID): ${member.user.id}`).setTimestamp()
    .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});
    // removed them and all hof records with them in from db
    db.deleteMember(member.user.id);
    db.hofDeleteUser(member.user.id);
    channelForMessage.send({ embeds: [embeddedMessage] });
});

// tracks any movement in VCs
Client.on('voiceStateUpdate', (oldState, newState) => {
    //gets the tracking channel and guild
    const madnessGuild = Client.guilds.cache.get('232961095571210251');
    const vcTracking = madnessGuild.channels.cache.get('789229766679068672');

    //gets member id and old and new channel id
    const member = madnessGuild.members.cache.get(oldState.id);
    const newChannelStatus = newState.channelId;
    const oldChannelStatus = oldState.channelId;

    // if they've moved into a vc
    if (newChannelStatus !== null) {
        const newChannelID = madnessGuild.channels.cache.get(newChannelStatus);
        // if they've moved into a temp vc generator
        if (newChannelID.name.includes('➕')) {
            // count how many temp vcs currently exist and what size vc the user wants
            const temps = madnessGuild.channels.cache.filter(c => c.name.includes('Temp FT') && c.type === 'GUILD_VOICE').size;
            const limit = parseInt(newChannelID.name.replace(/\D+/g, ''));
            
            // creates a new vc with the desired limit and corretly incremented name
            // places the new vc below the vc generator, assigns it's parent category and moves the user in
            madnessGuild.channels.create('Temp FT '+ (temps+1),{
                type: 'GUILD_VOICE',
                bitrate: 64000,
                userLimit: limit,
                position: newChannelID.rawPosition,
                permissionOverwrites : newChannelID.permissionOverwrites.cache
            }).then(chann=>{
                chann.setParent(newChannelID.parentId);
                newState.setChannel(chann)
            })
        } 
        else {
            // updates user activity and tracks the vc movement
            db.updateActivity(member.user.id);
			const embeddedMessage = new Discord.MessageEmbed()
        	.setColor('GREEN').setTimestamp()
            .setAuthor({name:`${ member.nickname } has joined a VC`, iconURL: member.user.displayAvatarURL({ format: 'png', dynamic: true })})
            .setDescription(`:speaker: Channel joined: <#${newChannelStatus}> \n **${newChannelID.members.size} users** in channel.`);
            vcTracking.send({ embeds: [embeddedMessage] });
        }
    }
    if (oldChannelStatus !== null) {
        // if the member left a temp vc which is now empty it deletes the temp vc
        const oldChannelID = madnessGuild.channels.cache.get(oldChannelStatus);
        if (oldChannelID.name.includes('Temp') && oldChannelID.members.size == 0) {oldChannelID.delete()} 
        else {
            // tracks the vc movement
            const embeddedMessage = new Discord.MessageEmbed()
            .setColor('RED').setTimestamp()
            .setAuthor({name:`${ member.nickname } left a VC`, iconURL: member.user.displayAvatarURL({ format: 'png', dynamic: true })})
            .setDescription(`:speaker: Channel left: <#${oldChannelStatus}> \n **${oldChannelID.members.size} users** in channel.`);
            vcTracking.send({ embeds: [embeddedMessage] });
        }
    }

});
// handles when a role is deleted
Client.on('roleDelete', (role) => {
    // pulls the assign data
    const assigns = require('./roles.json');
    // checks if the deleted role was in any of the assignable menus
    const result = Object.entries(assigns).filter(([name,cat])=>role.name in cat);
    if (result.length == 0) return null;
    // removes the role from the menu if it was found and overwrites the json data
    delete assigns[result[0][0]][role.name]
    fs.writeFileSync('./roles.json', JSON.stringify(assigns, null, 2), function writeJSON(err) { console.log(err?err:'Writing to roles.json') });
});


//catch any errors or warns that the Client might encounter
Client.on('error', (e) => console.error('ewwow'));
Client.on('warn', (e) => console.warn('error'));