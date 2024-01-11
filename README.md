# Toolbox
- This was a toolbox I created two years ago to dip my feet into antibots and fingerprinting, as well as automation scripts. I mainly used it as a way to develop my skills as a developer and to further develop my knowledge of JS/NodeJS

## Features
- This is a toolbox that mainly targetted Adidas/Nike modules. Modules include Account Generator, Draw (Nike), Account Delete, Account Defaults, Order Check, Session Storage, etc & Also has an ICloud generator

### How To Install
To install simply run 
```
1. git clone https://github.com/senpai0807/lunarGen.git
2. cd lunarGen
3. pnpm install or npm install or yarn install
4. npm run build
```

### Deprecation
- A lot of the features, such as the auto update system, discord rpc, checkout/generation analytics, etc. You will have to refactor it if you want to keep/maintain these features or you can remove them entirely

### TODO
- Within the package.json, set the URL to the platform you'll be using for updates
- Within checkForUpdate.js, you will need to create a place to store updates and versions. I.E: Digital Oceans, AWS, etc
- Within the ./src/index.js, you will need to create an auth system for the toolbox to use
- Within the main.js, if you would like to use discord rpc, you will need to set the client ID
- You will also need to set your database URL within the .env, I personally used MongoDB

### Contribution
- Feel free to pull this and do whatever you wish, whether it's to use it as a basis for your current project, or using the modules to integrating into your own software, or simply wanting to distribute it yourself.
