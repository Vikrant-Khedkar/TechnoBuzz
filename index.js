require('dotenv').config();

const { Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require('@discordjs/voice');

const { spawn } = require('child_process');

/**
 * ✅ Stable techno radio stream (Discord-safe)
 * If you want to change genre later, only change this URL.
 */
const STREAM_URL = 'https://ice1.somafm.com/groovesalad-128-mp3';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

/**
 * Create an FFmpeg PCM stream for Discord
 */
function createFFmpegStream() {
  return spawn('ffmpeg', [
    '-nostdin',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', STREAM_URL,
    '-vn',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ]);
}

client.once(Events.ClientReady, async () => {
  console.log('🎧 Techno bot online');

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();

  function playStream() {
    const ffmpeg = createFFmpegStream();

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
    });

    player.play(resource);
  }

  playStream();
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    console.log('🔁 Stream ended, restarting...');
    playStream();
  });

  player.on('error', (err) => {
    console.error('❌ Player error:', err.message);
    playStream();
  });
});

client.login(process.env.TOKEN);
