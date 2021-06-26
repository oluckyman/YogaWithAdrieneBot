
declare module 'dashbot' {
    export default function(apiKey?: string, config?: Config): { universal: DashbotUniversal }

    interface Config {
        debug?: Boolean,
        redact?: Boolean
        timeout?: Number
    }
     
    interface MessageForDashbot {
        /** Raw message from/to user */
        text: string
        userId: string
        /** The meaning of the message (e.g. command) */
        intent?: DashbotIntent
        /** Raw json as is to look into it for all the details */
        platformJson?: object
    }

    /** Inent docs: https://www.dashbot.io/docs/facebook/intents */
    interface DashbotIntent {
        name: string
        inputs: Array<{ name: string, value: string }>
    }
    interface DashbotIntentToday extends DashbotIntent {
        name: 'today'
        inputs: [{ name: 'day', value: string }]
    }
    interface DashbotIntentStart extends DashbotIntent {
        name: 'start'
        inputs: [{ name: 'ref', value: string }]
    }
    interface DashbotIntentCalendar extends DashbotIntent {
        name: 'calendar'
        inputs: []
    }
    interface DashbotIntentHelp extends DashbotIntent {
        name: 'help'
        inputs: []
    }
    interface DashbotIntentSmallTalk extends DashbotIntent {
        name: 'smallTalk'
        inputs: []
    }
    interface DashbotIntentNotHandled extends DashbotIntent {
        name: 'NotHandled'
        inputs: []
    }

    interface DashbotUniversal {
        logIncoming(message: MessageForDashbot): void
        logOutgoing(message: MessageForDashbot): void
    }
}
