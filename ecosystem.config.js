module.exports = {
  apps : [
      {
    'name': "caly",
    'script': "./index.js",
    'watch': true,
    'ignore_watch' : ['unused','node_modules','.pm2','.npm','.config','./**/**.json', ],     
    'instances': "1",
    'log_date_format':"YYYY-MM-DD HH:mm:ss Z",
    'max_memory_restart': '210M',
    "node_args": [
        "--max_old_space_size=200"
    ],
    'env': {
      'NODE_ENV': "development",
    },
    'env_production': {
      'NODE_ENV': "production",
    }
  }]
}