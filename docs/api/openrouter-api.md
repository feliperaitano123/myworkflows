Chat completion
POST
https://openrouter.ai/api/v1/chat/completions
POST
/api/v1/chat/completions

cURL

curl -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
  "model": "openai/gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
}'
Try it
200
Successful

{
  "id": "gen-12345",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The meaning of life is a complex and subjective question..."
      }
    }
  ]
}
Send a chat completion request to a selected model. The request must contain a "messages" array. All advanced options from the base request are also supported.
Headers
Authorization
string
Required
Bearer authentication of the form Bearer <token>, where token is your auth token.

Request
This endpoint expects an object.
model
string
Required
The model ID to use. If unspecified, the user's default is used.
messages
list of objects
Required

Hide 2 properties
role
enum
Required
Allowed values:
system
developer
user
assistant
tool
content
string
Required
models
list of strings
Optional
Alternate list of models for routing overrides.
provider
object
Optional
Preferences for provider routing.

Hide 1 properties
sort
string
Optional
Sort preference (e.g., price, throughput).

reasoning
object
Optional
Configuration for model reasoning/thinking tokens


Hide 3 properties
effort
enum
Optional
OpenAI-style reasoning effort setting

Allowed values:
high
medium
low
max_tokens
integer
Optional
Non-OpenAI-style reasoning effort setting. Cannot be used simultaneously with effort.

exclude
boolean
Optional
Defaults to false
Whether to exclude reasoning from the response
usage
object
Optional
Whether to include usage information in the response

Hide 1 properties
include
boolean
Optional
Whether to include usage information in the response
transforms
list of strings
Optional
List of prompt transforms (OpenRouter-only).

stream
boolean
Optional
Defaults to false
Enable streaming of results.
max_tokens
integer
Optional
Maximum number of tokens (range: [1, context_length)).

temperature
double
Optional
Sampling temperature (range: [0, 2]).

seed
integer
Optional
Seed for deterministic outputs.
top_p
double
Optional
Top-p sampling value (range: (0, 1]).

top_k
integer
Optional
Top-k sampling value (range: [1, Infinity)).

frequency_penalty
double
Optional
Frequency penalty (range: [-2, 2]).

presence_penalty
double
Optional
Presence penalty (range: [-2, 2]).

repetition_penalty
double
Optional
Repetition penalty (range: (0, 2]).

logit_bias
map from strings to doubles
Optional
Mapping of token IDs to bias values.
top_logprobs
integer
Optional
Number of top log probabilities to return.
min_p
double
Optional
Minimum probability threshold (range: [0, 1]).

top_a
double
Optional
Alternate top sampling parameter (range: [0, 1]).

user
string
Optional
A stable identifier for your end-users. Used to help detect and prevent abuse.

Response
Successful completion
id
string or null
choices
list of objects or null

Show 1 properties
