const { SlashCommandBuilder } = require('@discordjs/builders');
const timezones = require('timezone-abbr-offsets')
const { roles } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Returns markdown timestamp')
		.setDefaultPermission(false)
		.addIntegerOption(option => option.setName('hour').setDescription('Hour:').setRequired(true))
    	.addIntegerOption(option => option.setName('minutes').setDescription('Minutes:').setRequired(true))
    	.addStringOption(option => option.setName('timezone').setDescription('Timezone: (UTC Default)').setRequired(false))
    	.addIntegerOption(option => option.setName('date').setDescription('Date:').setRequired(false))
    	.addIntegerOption(option => option.setName('month').setDescription('Month:').setRequired(false)),

	async execute(interaction) {
        // puts off replying to interaction
		await interaction.deferReply();
        const hr = interaction.options.getInteger('hour');
		const min= interaction.options.getInteger('minutes');
		let tz = interaction.options.getString('timezone');
		let dt = interaction.options.getInteger('date');
		let mth= interaction.options.getInteger('month');
		// if no date or month are specified, the variables are set to the current date and month
        if(!dt){dt= new Date().getDate()};
		if(!mth){mth= new Date().getMonth()+1};
        // gets the current year
		const yr = new Date().getFullYear();
        // converts timezone code to offset
        const tshift =tz?(timezones[tz.toUpperCase()] * 60 * 1000):0;
        // formats datetime options into a parseable string
        const tstamp = `${yr}-${mth}-${dt} ${hr}:${min}:00 UTC`;
        // calculates seconds since epoch
		const epoch = (Date.parse(tstamp)-tshift)/1000;
        // if the calculated epoch isn't invalid then a reply is sent with the epoch time formatted into a Discord timestamp
        await interaction.editReply(Number.isNaN(epoch) ? 'Not a valid datetime':`\`<t:${epoch}:R>\`\n<t:${epoch}:R>`);
    },
}