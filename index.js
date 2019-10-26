/// <reference types="@vertx/core/runtime" />
// @ts-check

import {Router} from '@vertx/web';

import {PgClient, Tuple} from '@reactiverse/reactive-pg-client';
import {PgPoolOptions} from '@reactiverse/reactive-pg-client/options';
import {RockerTemplateEngine} from '@vertx/web-templ-rocker'

const util = require('./util');

const SERVER = 'vertx.js';

const app = Router.router(vertx);
const template = RockerTemplateEngine.create();
let date = new Date().toUTCString();

vertx.setPeriodic(1000, t => date = new Date().toUTCString());

const UPDATE_USER = "UPDATE users SET firstName=$1, lastName=$2 WHERE id=$3";
const SELECT_USER = "SELECT id, firstName from users LIMIT 10";

let client = PgClient.pool(
  vertx,
  new PgPoolOptions()
    .setCachePreparedStatements(true)
    .setMaxSize(1)
    .setHost('locahhost')
    .setUser('heri')
    .setPassword('pass')
    .setDatabase('users'));

// List of users, json response
app.get("/users").handler(ctx => {
  let failed = false;
  let users = [];

  client.preparedQuery(SELECT_USER, res => {
    if (res.succeeded()) {
      let resultSet = res.result().iterator();

      if (!resultSet.hasNext()) {
        ctx.fail(404);
        return;
      }

      // we need a final reference
      const row = resultSet.next();
      users.push({id: row.getString(0), firstName: row.getString(1), lastName: row.getString(1)});

      ctx.response()
        .putHeader("Server", SERVER)
        .putHeader("Date", date)
        .putHeader("Content-Type", "application/json")
        .end(JSON.stringify(users));
    } else {
      ctx.fail(res.cause());
    }
  })
});

// List of users, HTML response
app.get("/").handler(ctx => {
  client.preparedQuery(SELECT_USER, ar => {

    if (ar.failed()) {
      ctx.fail(ar.cause());
      return;
    }

    let users = [];
    let resultSet = ar.result().iterator();

    if (!resultSet.hasNext()) {
      ctx.fail(404);
      return;
    }

    while (resultSet.hasNext()) {
      let row = resultSet.next();
      users.push({id: row.getString(0), firstName: row.getString(1), lastName: row.getString(2)});
    }

    template.render({users: users}, "Users.rocker.html", res => {
      if (res.succeeded()) {
        ctx.response()
          .putHeader("Server", SERVER)
          .putHeader("Date", date)
          .putHeader("Content-Type", "text/html; charset=UTF-8")
          .end(res.result());
      } else {
        ctx.fail(res.cause());
      }
    });
  });
});

// user creation via webhook (json)
app.route("/webhook").handler(ctx => {
  let failed = false;
  let users = [];

  const id = ctx.request().getParam("id");
  const firstName = ctx.request().getParam("firstName");
  const lastName = ctx.request().getParam("lastName");


  client.preparedQuery(UPDATE_USER, Tuple.of(firstName, lastName, id), ar => {
    if (!failed) {
      if (ar.failed()) {
        failed = true;
        ctx.fail(ar.cause());
        return;
      }

      const row = ar.result().iterator().next();
      users.push({id: row.getString(0), firstName: row.getString(1), lastName: row.getString(2)});

      ctx.response()
        .putHeader("Server", SERVER)
        .putHeader("Date", date)
        .putHeader("Content-Type", "application/json")
        .end(JSON.stringify(users));
    }
  });
  
});

vertx
  .createHttpServer()
  .requestHandler(app)
  .listen(8080);

console.log('Server listening at: http://localhost:8080/');