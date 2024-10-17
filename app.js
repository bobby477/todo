const express = require('express')
const {format} = require('date-fns')
const isValid = require('date-fns/isValid')
const path = require('path')

const {open} = require('sqlite')

const sqlite3 = require('sqlite3')

const dbpath = path.join(__dirname, 'todoApplication.db')

const app = express()

app.use(express.json())

let db = null

const server = async () => {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})

    app.listen(3000, () => {
      console.log('Successfully')
    })
  } catch (e) {
    console.log(`error ${e}`)
    process.exit(1)
  }
}

server()

const cat = ['WORK', 'HOME', 'LEARNING']
const state = ['TO DO', 'IN PROGRESS', 'DONE']
const pri = ['HIGH', 'MEDIUM', 'LOW']

const verifyQuery = (request, response, next) => {
  const {category, priority, status, due_date} = request.query

  if (category !== undefined) {
    const isCat = cat.includes(category)

    if (isCat === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
    }
  }

  if (priority !== undefined) {
    const isPri = pri.includes(priority)

    if (isPri === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
    }
  }

  if (status !== undefined) {
    const isState = state.includes(status)

    if (isState === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
    }
  }

  if (due_date !== undefined) {
    const formated = format(new Date(due_date), 'yyyy-MM-dd')

    const valid = isValid(new Date(due_date))

    if (valid === true) {
      request.due_date = formated
    } else {
      response.status(400)
      response.send('Invalid Due Date')
    }
  }

  next()
}

const changeCase = result => {
  return result.map(each => ({
    id: each.id,
    todo: each.todo,
    priority: each.priority,
    status: each.status,
    category: each.category,
    dueDate: each.due_date,
  }))
}

app.get('/todos', verifyQuery, async (request, response) => {
  const {
    priority = '',
    status = '',
    category = '',
    due_date = '',
    search_q = '',
  } = request.query

  const dbquery = `SELECT * FROM todo WHERE status LIKE '%${status}%' AND priority LIKE '%${priority}%' AND category LIKE '%${category}%' AND todo LIKE '%${search_q}%';`

  const result = await db.all(dbquery)
  response.send(changeCase(result))
})

app.get('/todos/:todoId/', verifyQuery, async (request, response) => {
  const {todoId} = request.params

  const dbquery = `SELECT * FROM todo WHERE id = ${todoId};`

  const result = await db.get(dbquery)

  response.send(result)
})

app.get('/agenda/', verifyQuery, async (request, response) => {
  const {date} = request.query
  const formated = format(new Date(date), 'yyyy-MM-dd')
  const dbquery = `SELECT * FROM todo WHERE due_date="${formated}";`
  const result = await db.all(dbquery)
  response.send(changeCase(result))
})

app.post('/todos/', verifyQuery, async (request, response) => {
  const details = request.body

  const {id, todo, priority, status} = details

  const dbquery = `INSERT INTO todo (id,todo,priority,status) VALUES(${id},'${todo}','${priority}','${status}');`

  await db.run(dbquery)

  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', verifyQuery, async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, due_date} = request.body

  if (due_date !== undefined) {
    const isVal = isValid(new Date(due_date))
    if (!isVal) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }

  const getTodoQuery = `
       SELECT
         *
       FROM
         todo
       WHERE
         id = ${todoId};`
  const previousTodo = await db.get(getTodoQuery)
  console.log(previousTodo.todo)

  const {
    todo: newTodo = previousTodo.todo,
    priority: newPriority = previousTodo.priority,
    status: newStatus = previousTodo.status,
    category: newCategory = previousTodo.category,
    due_date: newDate = previousTodo.due_date,
  } = request.body

  const updateTodoQuery = `
       UPDATE
         todo
       SET
         todo='${newTodo}',
         priority='${newPriority}',
         status='${newStatus}',
         category='${newCategory}',
         due_date='${newDate}'
         
       WHERE
         id=${todoId};`

  await db.run(updateTodoQuery)

  if (status !== undefined) {
    response.send('Status Updated')
  } else if (priority !== undefined) {
    response.send('Priority Updated')
  } else if (todo !== undefined) {
    response.send('Todo Updated')
  } else if (category !== undefined) {
    response.send('Category Updated')
  } else if (due_date !== undefined) {
    response.send('Due Date Updated')
  }
})

app.delete('/todos/:todoId/', verifyQuery, async (request, response) => {
  const {todoId} = request.params

  const dbquery = `DELETE FROM todo WHERE id=${todoId};`

  await db.run(dbquery)

  response.send('Todo Deleted')
})

module.exports = app
