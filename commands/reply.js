const {	SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Caly Reply').setDefaultPermission(false)
    .addStringOption(option => option.setName('target').setDescription('Message to reply to').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Reply Message').setRequired(true)),
    
	async execute(interaction) {
        // puts off replying to interaction then deletes the original command
        interaction.deferReply().then(_=>interaction.deleteReply());
        let target = await interaction.options.getString('target');
        let reply = await interaction.options.getString('message')
        // if the message id links to an actual message in the current channel, a reply is sent
        try { (await interaction.channel.messages.fetch(target)).reply(reply) }
        catch {}
    },
};