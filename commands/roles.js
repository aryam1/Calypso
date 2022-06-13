const { SlashCommandBuilder } = require('@discordjs/builders');
const { roles } = require('../config.json');
const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
    .setDefaultPermission(false)
	.setDescription('Controls the self assignable roles')
    .addSubcommand((subcommand)=>
                   subcommand.setName('add')
                   .setDescription('Add a role')
                   .addStringOption(option =>option.setName('name').setDescription('Name of role to add').setRequired(true))
                   .addStringOption(option=>option.setName('emoji').setDescription('Emoji for role').setRequired(true))
                   .addStringOption(option=>option.setName('category').setDescription('Role Category').setRequired(true)
                                    .addChoices(
        										{name:'Personal',value:'personal'},
                                                {name:'Miscellaneous',value:'misc'},
                                                {name:'Destiny 2',value:'d2'}
    											))
                  )
    .addSubcommand((subcommand)=>subcommand.setName('remove').setDescription('Remove a role')
                   .addRoleOption(option =>option.setName('role').setDescription('Choose role to remove').setRequired(true)))
    .addSubcommand((subcommand)=>subcommand.setName('setup').setDescription('Refreshes the drop-down menus')),
    
    async execute(interaction,update=false) {
        // puts off replying to interaction if function was called via interaction
        if (!update) {await interaction.deferReply()}
        // loads roles data
        const assigns = require('../roles.json');
        if (interaction.options.getSubcommand() == 'setup' || update == true){
            // sets up 3 select menus, one for each type of role assignment and assigns the options for each from the loaded json file
            const menuData = Object.values(assigns.personal);
            const personalMenu = new Discord.MessageSelectMenu().setCustomId('roles-personal').setPlaceholder('Personal Self-Assigned Roles')
            .setMinValues(0).setMaxValues(3).addOptions(menuData);
            const personalRow = new Discord.MessageActionRow().addComponents(personalMenu);

            const miscData = Object.values(assigns.misc);
            const miscMenu =  new Discord.MessageSelectMenu().setCustomId('roles-misc').setPlaceholder('Miscellaneous Self-Assigned Roles')
            .setMinValues(1).setMaxValues(miscData.length).addOptions(miscData);
            const miscRow = new Discord.MessageActionRow().addComponents(miscMenu);
            
            const d2Data = Object.values(assigns.d2);
            const d2Menu =  new Discord.MessageSelectMenu().setCustomId('roles-d2').setPlaceholder('Destiny 2 Self-Assigned Roles')
            .setMinValues(0).setMaxValues(d2Data.length).addOptions(d2Data);
            const d2Row = new Discord.MessageActionRow().addComponents(d2Menu);
            
            let roleChan = await interaction.guild.channels.fetch('763054604165840926');
            // deletes all messages in #role-assignment then sends a new message with all 3 select menu rows attached
            await roleChan.messages.fetch().then(msgs=>msgs.map(msg=>msg.delete()))
            roleChan.send({ embeds :[new Discord.MessageEmbed().setColor('GREEN').setTitle('Select a role option from the menu below to add it to yourself. \n If you already have one of the selected roles then it will be removed instead')], components:[personalRow,miscRow,d2Row]})
            // if function was called by a slash command, deletes the slash command
            if (!update) {interaction.deleteReply()}
            else {return null}
        }
        else if (interaction.options.getSubcommand() == 'remove'){
            const role = interaction.options.getRole('role');
            // checks if the role to be deleted is actually in the roles json file
            const result = Object.entries(assigns).filter(([name,cat])=>role.name in cat);
            if (result.length == 0) {interaction.reply('That is not a self-assignable role'); return null}
            // deletes the role from the stored roles data
            delete assigns[result[0][0]][role.name]
            // overwrites the json file with the stored data
            fs.writeFileSync('./roles.json', JSON.stringify(assigns, null, 2), function writeJSON(err) {
                if (err) return console.log(err);
              console.log('writing to ./roles.json');
            });
            await interaction.editReply('Role Removed');
            // calls itself with check as true to refresh the role assignment menu
            this.execute(interaction,true);
        }
        // if subcomamnd is to add
        else {
            // gets name of role and formats it 
            const name = interaction.options.getString('name');
            const titleName = name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            // gets id of associated emoji
            let emoji = interaction.options.getString('emoji').match(/:(\d+)>/);
            const cat = interaction.options.getString('category');
            // check if emoji is valid and in the server
            if (emoji?.length !== 2) { interaction.editReply("Use a proper emoji from this server"); return null }
            if (!interaction.guild.emojis.cache.has(emoji[1])) { interaction.editReply("Use a proper emoji from this server"); return null }
            // checks if role is alread in json file
            if (name in assigns[cat]) { interaction.editReply("Role already in master list, use /roles setup to refresh"); return null }
            emoji = emoji[1];
            // finds role with matching name in the server
            let current = await interaction.guild.roles.cache.find(role => role.name.toLowerCase() == name.toLowerCase());
            let id = current?.id;
            // if there isn't an existing role, a new one is created and the new id is stored
            if (!current) {
                const pos = (await interaction.guild.roles.fetch('847896429771096095')).rawPosition +1;
                let role = await interaction.guild.roles.create({
                        name: titleName,
                        permissions: 6442452480n,
                        position: pos 
                });
                id = role.id
            }
            // adds new entry to stored role data under the relevant category
            const entry = {"label": titleName, "emoji": emoji, "value": id};
            assigns[cat][titleName] = entry;
            // overwrites the json file with the stored data
            fs.writeFileSync('./roles.json', JSON.stringify(assigns, null, 2), function writeJSON(err) {
                 if (err) return console.log(err);
                 console.log('writing to ./roles.json');
            });
            await interaction.editReply('Role Added');
            // calls itself with check as true to refresh the role assignment menu
            this.execute(interaction,true);
        }
    },
    async selectHandle(interaction){
        // if no values are selected do nothing
        if (interaction.values.length == 0 ) {interaction.deferUpdate();return null}
        // reduce selected options into list of roles the member already has a list of roles they don't have
        let [removed, added] =interaction.values.reduce((result, role) => {
            result[interaction.member._roles.includes(role) ? 0 : 1].push(role); 
      		return result;
        }, [[], []]);
        // adds and removes the relevant roles
        await interaction.member.roles.remove(removed);
        await interaction.member.roles.add(added);
        // updates the message and lets the member know how many roles were changed
        await interaction.update({ embeds:interaction.message.embeds, components:interaction.message.components })
        interaction.followUp({content:`Roles added: ${added.length}\nRoles removed: ${removed.length}`, ephemeral:true})
    },
};