This file is to remind me of little tasks todo without breaking my flow or claude related feature-creep

1. channels page pagination
1. code quality
    1. checkout pyscn/integrate maybe github actions?
    1. find similar code quality analyzer for FE
1. add sidebar filtering videos by channels
1. add "not interested" option - and filtering based on it
1. keep filters state when moving between pages
1. import flow:
  1. import should start on "enter"
  1. import should continue after authentication flow
  1. GUI issue in tag system
  1. continue importing in the background
1. Create design system: 
    1. use Dribbble.com for insparation 
    1. work with chatgpt/claude to decide on what needs to be defined and how for the design system
    1. choose two main colors
    1. add a background gradient based on the tag and have cards with frosted glass
    1. make text and items hierarchy 
1. add config validation on start
1. in channels page add 
    1. channels search
    1. channels filter by tags
1. sso login with google
1. email verification
1. otp login
1. videos page filter appears when mouse gets near navbar
1. add profile page
1. review settings page
1. tag management / assigning pagination
1. extract your subscriptions to componenet
1. extract available channels to component
1. Running Migrator().run() in init can be heavy- Initializing migrations every time a tracker is instantiated may add latency. Prefer running once at startup (e.g., AppConfig.ready) or gate with a module-level flag.
1. make skeleton loader more independent
1. add story book
1. add reference when marking watched it's being saved
1. add logo - talk with victoria
1. user dropdown - change links to configuration, and that links work
1. responsive channels page
1. move frontend to frontend folder
1. implement centralized logging:
    1. frontend
    1. backend
1. Deployment!: 
    1. monitoring!
    1. admin system
    1. choose hosting for db/fe/be