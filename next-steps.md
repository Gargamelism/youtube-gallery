## This file is to remind me of little tasks todo without breaking my flow or claude related feature-creep


1. code quality
    1. checkout pyscn/integrate maybe github actions?
    1. find similar code quality analyzer for FE
1. import issues:
    1. @PASHUTwellness
    1. @nunu_Official
    1. @TheAdamConover
1. add "not interested" option - and filtering based on it
1. add sidebar filtering videos by channels
1. keep filters state when moving between pages
1. import flow:
    1. import should start on "enter"
    1. import should continue after authentication flow
    1. tag chevron out of box
    1. continue importing in the background
1. tag limits
1. bottom subscribed channels page separator looks weird
1. Create design system: 
    1. use Dribbble.com + mobbin for insparation 
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
1. implement centralized logging:
    1. frontend
    1. backend
1. Deployment!: 
    1. review legal requirements:
        1. pp/tos
        1. cookies modal
    1. monitoring!
    1. admin system
    1. choose hosting for db/fe/be
        1. Maybe self hosting with https://www.hetzner.com/cloud + Coolify?
1. row level permissions in db
1. import subscriptions from youtube
1. move tags to bottom of channel/video card so the shape will be consistent
1. turn validation query does not pass validation to a decorator
1. turn quota tracking operations to an enum
1. fix backend dev hot reload
1. make navigation clickable with middle click
1. handle captcha errors
1. full player with auto mark as watched
1. add config lib for frontend
1. if no channels/no videos auto direct to channels page
1. open manage tags modal - auto focus to tag name
1. mark as watched - add some "loading mode"
1. email is too long in profile drop down
1. ctrl+r/ctrl+shift+r don't work