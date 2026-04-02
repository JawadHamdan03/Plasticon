# Users API

Base path: /users

## GET /users/all
- Access: ADMIN
- Description: list all users

## GET /users/:id
- Access: ADMIN
- Params:
  - id (number)

## DELETE /users/:id
- Access: ADMIN
- Params:
  - id (number)

## Examples

Get all users request:

GET /users/all

Get user by id request:

GET /users/1

Delete user response:

{
  "message": "User deleted successfully"
}
