---
layout: post
title: "Eliminating Boilerplate and Increasing Reusability with Higher-Order Reducers"
date: 2018-08-24 12:00:00 -0800
cover: /assets/images/higher-order-reducers/redux.png
exerpt: My team has changed the way we write our redux reducers, choosing a more dynamic approach than the common switch statement. Creating reducers with higher-order factory functions gives us some great benefits. They can make the process of writing reducers faster and they're also flexible functions that can be used to generalize patterns and reduce repetition.
authors:
  - name: Bill Heberer
    url: https://github.com/bheberer
    photo: https://avatars.githubusercontent.com/bheberer
---

### Motivation

During my internship at GoDaddy, I've had the opportunity to work on the Account Homepage team, a Front-End centric team working on GoDaddy's new experience for logged in users. My team uses [Redux](https://redux.js.org/) to manage the staet of this app.

Most complaints about Redux are related to boilerplate code and verboseness. These complaints are well-founded, as Redux was intended to make state changes obvious, not concise. In smaller apps, this kind of code isn't as much of a problem, but it becomes a significant time sink in large-scale apps. 

Reducer functions were a pain point for my team. We used switch statements to write our reducers, which amounts to a lot of boilerplate. This boilerplate added up as our project progressed and we continued to add actions, so we ended up with some pretty large functions. These functions were cumbersome and often repetitive, so we decided to forego this static way of writing reducers for a more dynamic approach using higher-order reducers.

In this article, I'll show a reducer written with the static approach and show you step by step how you can turn that reducer into something dynamic and concise, without losing the predictable nature of Redux state changes.

### The Static Approach

Below is an example of a reducer that uses the static approach. We use a switch statement to handle each action type that we expect to receive.

```js
const fetchingDomainsAction = {
  type: 'FETCHING_DOMAINS',
  payload: {
    isFetchingDomains: true
  }
}

const domainsFetchedAction = {
  type: 'DOMAINS_FETCHED',
  payload: {
    isFetchingDomains: false,
    domains: 'fetched'
  }
}

const domainsFetchErrorAction = {
  type: 'DOMAINS_FETCH_ERROR',
  payload: {
    isFetchingDomains: false,
    error: 'fetching'
  }
}

const reducer = (state, action) => {
  switch(action.type) {
    case FETCHING_DOMAINS:
      return {
        ...state,
        ...action.payload
      }
    case DOMAINS_FETCHED:
      return {
        ...state,
        ...action.payload
      }
    case DOMAINS_FETCH_ERROR:
      return {
        ...state,
        ...action.payload
      }
    default:
      return state
  }
}
```

 This function by itself isn't so bad, but the problems become exacerbated once we add more action types. The function becomes repetitious and harder to read. Even in the example above you can see that both of our action handlers are doing the same thing. This is where the dynamic approach comes into play.

### Higher-Order Reducers

We'll address these problems with higher-order functions. We're going to create a higher-order reducer, a function that takes in and/or returns a reducer. To begin with, we're going to use the createReducer function that is shown in the [Redux documentation](https://redux.js.org/recipes/reducingboilerplate).

```js
const createReducer = (intialState, actionHandlers) =>
  (state = initialState, action) =>
    actionHandlers.hasOwnProperty(action.type) ?
      actionHandlers[action.type](state, action) :
      state
```

Let's go over what this function is doing. It takes the initial state of the app and an ```actionHandlers``` object. This object is an abstraction of the switch statement that we had before into a lookup table of handler functions. The function then returns a reducer that takes in previous state and an action. When called, this reducer will check that the ```actionHandlers``` parameter contains the received action type. If it does, the corresponding handler will get called. If not, the previous state is returned.

If we use this function to create the reducer shown above, we end up with this.

```js
const reducer = createReducer({}, {
  ['FETCHING_DATA']: (state, action) => ({
    ...state,
    ...action.payload
  }),
  ['DATA_FETCHED']: (state, action) => ({
    ...state, 
    ...action.payload
  }),
  ['FETCH_ERROR']: (state, action) => ({
    ...state,
    ...action.payload
  })
})
```
This feels better than using a switch statement, but not by much. It still feels like boilerplate and we haven't addressed the repetition yet. On my team, we found that the use of a default handler function to be helping in dealing with these problems.

Let's adjust our ```createReducer``` function to use a default handler.

```js
const createReducer = (initialState, defaultHandler, actionTypes) =>
  (state = initialState, action) =>
    actionTypes.includes(action.type) ?
      defaultHandler(state, action) :
      state
```

Now ```createReducer``` takes in the initial state, an array full of potential action types and a default handler function, which will be called by each action type in the reducer. We use an array here for concision and because it's actually faster to use the array includes method than using a lookup table for smaller sample sizes. Using a ```defaultHandler``` makes adding an action type to a reducer is incredibly fast, all you have to do is add the new action type into your ```actionTypes``` parameter. The time needed to create the reducer has gone down, and the repetition has been elimated as well. Here's what our reducer looks like now.

```js
const updateState = (state, action) => ({ 
  ...state, 
  ...action.payload 
})

const reducer = createReducer({}, updateState, [
  'FETCHING_DATA',
  'DATA_FETCHED',
  'FETCH_ERROR'
])
```

Looks pretty good doesn't it? Now creating a reducer is as simple as defining a handler function and providing the action types you expect to receive.

This is pretty cool, but there is a problem with our ```createReducer``` function in its current state. It's only useful if the reducer that we're creating recieves action types that all get handled the same way. We needed to find a way to let users override the ```defaultHandler``` function if they had an action that required custom handling. This allows us to eliminate repetition while also keeping our reducers flexible. Let's check out a new version of ```createReducer``` that includes ```defaultHandler``` overriding.

```js
const createReducer = (initialState, defaultHandler, actionTypes, customHandlers) =>
  (state = initialState, action) =>
    actionTypes.includes(action.type) ?
      getActionHandler(defaultHandler, customHandlers, state, action) :
      state

const getActionHandler = (defaultHandler, customHandlers, state, action) =>
  customHandlers[action.type](state, action) ||
  defaultHandler(state, action)
```
This version of ```createReducer``` takes in an extra parameter. This customHandlers parameter is an object of handler functions that we want to override our default behavior. First, we check to see that the action type exists in our ```actionTypes``` array. If it does, we check to see if the corresponding action has a handler override in customHandlers. If it does we call it. If not, we call the ```defaultHandler```.

Let's recreate our fetching reducer using this new function. Instead of having all the actions follow the same pattern, we're going to have the ```DATA_FETCHED``` action add the data we've fetched to the end of an array.

```js
const updateState = (state, action) => ({ 
  ...state, 
  ...action.payload 
})

const addToArray = (state, action) => ({ 
  ...state,
  data: [...state.data, ...action.payload] 
})

const reducer = createReducer({}, updateState, [
  'FETCHING_DATA',
  'FETCH_ERROR',
  'DATA_FETCHED'
], {
  DATA_FETCHED: (state, action) => addToArray(state, action)
})
```

So now we have a reducer that handles the first two actions with our default handler and uses our special addToArray handler for the third action. This pattern is useful for large reducers that contain a lot of actions that are handled in a similar way. However, the pattern becomes less useful when you have smaller, more specialized reducers.

To keep repetition at a minimum when using small reducers, you need to be aware of certian patterns that can arise. For example we've been writing a reducer for fetching some data for this whole article. Fetching data is a pretty common pattern, and we usually have three actions to handle fetching. An action to tell us we're fetching the data, an action to tell us we've fetched the data and an action to tell us that the fetching has failed. If you can identify these kind of patterns in your code, you can use the ```createReducer``` function to generalize them into reusable reducer functions.

As an example, let's create a reusable fetching reducer. 

```js
/* Without defaultHandler */
const fetchingReducer = (fetching, fetched, error) =>
  createReducer({}, {
    [fetching]: updateState(state, action),
    [fetched]: updateState(state, action),
    [error]: updateState(state, action)
  })

/* With defaultHandler */
const fetchingReducer = (fetching, fetched, error) =>
  createReducer({}, updateState, [
    fetching,
    fetched,
    error
  ])
```

This function will take in the three actions that are associated with fetching data. It will then call the ```createReducer``` function and apply handlers to these actions, creating a reducer that we can use whenever we fetch any kind of data.

Here's how we would use it.

```js
const fetchingUsersAction = {
  type: 'FETCHING_USERS',
  payload: {
    isFetchingUsers: true
  }
}

const usersFetchedAction = {
  type: 'USERS_FETCHED',
  payload: {
    isFetchingUsers: false,
    users: 'fetched'
  }
}

const usersFetchErrorAction = {
  type: 'USERS_FETCH_ERROR',
  payload: {
    isFetchingUsers: false,
    error: 'fetching'
  }
}

const domains = fetchingReducer(
  'FETCH_DOMAINS',
  'DOMAINS_FETCHED',
  'DOMAIN_FETCH_ERROR'
)

const users = fetchingReducer(
  'FETCH_USERS',
  'USERS_FETCHED',
  'USER_FETCH_ERROR'
)
```

With our new, specialized ```fetchingReducer```, we were able to create slices of state for two unrelated pieces of data by taking advantage of the fact that they follow the same pattern. If you find yourself in a position where a lot of your reducers are following similar patterns, you can use specialized reducer functions to great affect in terms of eliminating repetition in your code.

### Conclusion

* Default handlers can make the addition of new action types to your reducers trivial if they follow the correct pattern. 
* Higher-order reducers decrease the amount of code that you have to write, leading to fewer small mistakes being made and a less tedious experience.
* Higher-order reducers can be used to eliminate repetition amongst reducers with the use of specialized reducer functions like our `fetchingReducer` example.
* These functions make it possible to have concise code while maintaining the predictable quality of Redux.
