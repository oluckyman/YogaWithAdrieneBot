
declare module 'dashbot' {
    export default function(apiKey?: string, config?: Config): { universal: DashbotUniversal }

    interface Config {
        debug?: Boolean,
        redact?: Boolean
        timeout?: Number
    }
     
    interface MessageForDashbot {
        text: string
        userId: string
        intent?: object
/*
text – string – (required)
userId – string – (required) – should be the SAME userId for both incoming and outgoing messages this is NOT the bot’s user ID
intent – object – (optional)
name – string
inputs – array
input – object
name – string
value – string
images – array – (optional)
image – object
url – string
buttons – array – (optional)
button – object
id – string
label – string
value – string
postback – object (optional)
buttonClick – object
buttonId – string
platformJson – object (optional) – send ALL of your platform-specific JSON here. It will be available for viewing in your transcripts.
*/
    }

    interface DashbotUniversal {
        logIncoming(message: MessageForDashbot): void
        logOutgoing(message: MessageForDashbot): void
    }
}
