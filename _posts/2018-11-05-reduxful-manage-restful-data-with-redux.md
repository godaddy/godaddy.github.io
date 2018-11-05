---
layout: post
title: "Reduxful: Manage RESTful data with Redux"
date: 2018-11-05 12:00:00 -0800
cover: /assets/images/reduxful/cover.png
excerpt: Introducing Reduxful, an open source project which aims to reduce the
  boilerplate for managing RESTful data with Redux by generating
  actions, reducers, and selectors for you.
authors:
  - name: Andrew Gerard
    url: https://www.linkedin.com/in/andrewgerard/
    photo: https://avatars0.githubusercontent.com/u/82775?s=400&v=4
---

As you may know, a web app's client-side state is often related to data
requested from RESTful services. There are several approaches to managing this
relationship, much of it depending on the technology stack you are working with.
At GoDaddy, we have standardized on building web apps with React and using Redux
for state management. We have recently open sourced a project to help manage 
RESTful data with Redux which we are now introducing, titled **Reduxful**.

Utilizing Redux to keep track of your requested data has many benefits.
A common example is when you have different areas of your application that need
to request data from the same endpoint. Centralizing your data into a Redux
store allows access to to it from different application areas, while retrieving
that data with a single request.

If you have worked with Redux or a Flux implementation before, you know that
setting up actions and reducers or stores can require tons of boilerplate code.
Even if you have not done this before, an example setup is presented next that
we will work with, followed by seeing how Reduxful makes the setup simpler.

### An example Redux setup

Let us consider what it might look like to tie into a simple API to view
doodads for a React app that needs to make requests from only two endpoints;
one that gets a list of doodads, and another that gets details for a specific
doodad.

```js
// actionCreators.js

import fetch from 'cross-fetch';

export const GET_DOODAD_START = 'GET_DOODAD_START';
export const GET_DOODAD_SUCCESS = 'GET_DOODAD_SUCCESS';
export const GET_DOODAD_LIST_START = 'GET_DOODAD_LIST_START';
export const GET_DOODAD_LIST_SUCCESS = 'GET_DOODAD_LIST_SUCCESS';

const getDoodadStart = doodadId => ({
  type: GET_DOODAD_START,
  payload: { doodadId }
});

const getDoodadSuccess = (doodadId, value) => ({
  type: GET_DOODAD_SUCCESS,
  payload: { doodadId, value }
});

const getDoodadListStart = () => ({
  type: GET_DOODAD_LIST_START,
  payload: { doodadId }
});

const getDoodadListSuccess = (value) => ({
  type: GET_DOODAD_LIST_SUCCESS,
  payload: { value }
});

export const getDoodad = doodadId => dispatch => {
  dispatch(getDoodadStart(doodadId));
  return fetch(`http://api.my-service.com/doodads/${doodadId}`)
    .then(response => response.json())
    .then(json => dispatch(getDoodadSuccess(doodadId, json)));
};

export const getDoodadList = () => dispatch => {
  dispatch(getDoodadListStart());
  return fetch(`http://api.my-service.com/doodads`)
    .then(response => response.json())
    .then(json => dispatch(getDoodadListSuccess(json)));
};
```

Here we have two action creators, `getDoodad` and `getDoodadList` which utilize
`fetch` to make the API call and dispatch the base actions. These action
creators are reliant upon the [redux-thunk] middleware to be asynchronous,
allowing us to dispatch our success action when our request comes back.

```js
// reducers.js

import {
  GET_DOODAD_START,
  GET_DOODAD_SUCCESS,
  GET_DOODAD_LIST_START,
  GET_DOODAD_LIST_SUCCESS
} from './actionCreators';

const doodads = (state = {}, action) => {
  if (GET_DOODAD_START === action.type) {
    const { doodadId } = action.payload;
    const { value } = (state[doodadId] || {});
    return {
      ...state,
      [doodadId]: {
        value,
        isLoaded: !!value,
        isUpdating: true
      }
    };
  }
  if (GET_DOODAD_SUCCESS === action.type) {
    const { doodadId, value } = action.payload;
    return {
      ...state,
      [doodadId]: {
        value,
        isLoaded: true,
        isUpdating: false
      }
    };
  }
  return state;
};

const doodadList = (state = {}, action) => {
  if (GET_DOODAD_LIST_START === action.type) {
    const { value } = state;
    return {
      value,
      isLoaded: !!value,
      isUpdating: true
    };
  }
  if (GET_DOODAD_LIST_SUCCESS === action.type) {
    const { value } = action.payload;
    return {
      value,
      isLoaded: true,
      isUpdating: false
    };
  }
  return state;
};

export default {
  doodads,
  doodadList
};
```

Our first reducer here allows us to keep track of each doodad request
separately, keyed uniquely by doodadId. Additionally, we are able to see if a
request is in flight by checking the `isUpdating` property, or if we have a
response by checking `isLoaded`.

```js
// selectors.js

export const selectDoodad = (state, doodadId) => {
  const { doodads = {}} = state;
  return doodads[doodadId];
};

export const selectDoodadList = (state) => {
  return state.doodadList;
};
```

For each request, at least two actions and creators are required with reducer
logic put in place. While it may not appear to be a _ton_ of code above,
remember that this is for requests to only two endpoints. This code will scale
linearly as more endpoints are added to the app.

The complexity grows when you start to add additional features. Say you need to 
start tracking additional details of a request such as duration or start and
end times. Also, note that we have no error handling above! This is an
additional implementation detail that will also scale linearly with each
endpoint you need to add.

### An example React app

Now that we have our Redux tools in place, let us see how we would use them in
a simple React app. Our app will have a top-level component to select doodads
from our list response, and a detail component to show our item response based
on the selection. 

```jsx
// ViewDoodadDetails.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { selectDoodad } from './selectors';
import * as actionCreators from './actionCreators';

class ViewDoodadDetails extends Component {

  static propTypes = {
    doodadId: PropTypes.string.isRequired,
    // injected
    getDoodad: PropTypes.func.isRequired,
    doodad: PropTypes.shape({
      value: PropTypes.object,
      isLoaded: PropTypes.bool.isRequired
    })
  };

  componentDidMount() {
    const { doodadId, getDoodad } = this.props;
    if (doodadId) {
      getDoodad(doodadId);
    }
  }

  componentDidUpdate(prevProps) {
    const { doodadId, getDoodad } = this.props;
    if (doodadId !== prevProps.doodadId) {
      getDoodad(doodadId);
    }
  }

  render() {
    const { doodad } = this.props;
    if (!doodad || !doodad.isLoaded) {
      return 'Loading doodad details';
    }

    return (
      <code>
        { doodad.value }
      </code>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { doodadId } = ownProps;
  return {
    doodad: selectDoodad(state, doodadId)
  };
};

const mapDispatchToProps = {
  getDoodad: actionCreators.getDoodad
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDoodadDetails);
```

```jsx
// ViewDoodads.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import ViewDoodadDetails from './ViewDoodadDetails';
import { selectDoodadList } from './selectors';
import * as actionCreators from './actionCreators';

class ViewDoodads extends Component {

  static propTypes = {
    // injected
    getDoodadList: PropTypes.func.isRequired,
    doodadList: PropTypes.shape({
      value: PropTypes.arrayOf(PropTypes.object),
      isLoaded: PropTypes.bool.isRequired
    })
  };

  constructor() {
    super();

    this.state = {
      doodadId: null
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    this.props.getDoodadList();
  }

  handleChange(event) {
    const doodadId = event.target.value;
    this.setState({ doodadId });
  }

  render() {
    const { doodadList } = this.props;
    const { doodadId } = this.state;

    if (!doodadList || !doodadList.isLoaded) {
      return 'Loading doodad list...';
    }

    return (
      <div>
        <h4>Select a doodad</h4>
        <select value={ doodadId } onChange={ this.handleChange }>
          { doodadList.value.map(doodad => (
            <option value={ doodad.id }>{ doodad.name }</option>
          )) }
        </select>
        <ViewDoodadDetails doodadId={ doodadId }/>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  doodadList: selectDoodadList(state)
});

const mapDispatchToProps = {
  getDoodadList: actionCreators.getDoodadList
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDoodads);
```

```jsx
// index.js

import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

import reducers from './reducers';
import ViewDoodads from './ViewDoodads';

const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, applyMiddleware(thunk));

render(
  <Provider store={ store }>
    <ViewDoodads />
  </Provider>,
  document.getElementById('root')
);
```

We are now ready to start viewing doodads. Using [react-redux] allows our
components to be decoupled from Redux workings. Now, there is a lot we
could talk about here. However, the focus of this write-up is on the work
required for tying our requested API data to Redux.

Without a framework for setting up actions and reducers, a lot of
copy/paste boilerplate is required, which is tedious and error-prone.
To mitigate this, let us now take a look at the **Reduxful** project.

### Origins

This project was born out of the development for the new hosting products 
web app. This new web app has the user experience goal of being a gateway for
users to manage all their hosting products in a single space. The developer
experience goal is to get product developers off of technology islands and to
build towards a single web app using shared technologies.

A new team was formed and tasked with getting this hosting project spun up. In
the early stages, this team quickly recognized that there were going be many
requests to several hosting product APIs and endpoints, with potentially just
as many ways implemented to keep track of requests and responses in the app.
So, as part of our strategy to simplify setups and unify development practices,
we developed Reduxful.

Reduxful actually started out as a Fluxible project, before the effort at
GoDaddy to standardize on Redux across the company. In effect, we have
implemented this API on two different Flux-like implementations, by which its
abstractions made the migration of our apps across implementations much easier.

### What it does

Reduxful aims to reduce the boilerplate for managing requested data in Redux
state by generating **actions**, **reducers**, and **selectors** for you.
Consider this brief example:

```jsx
// doodadApi.js

import Reduxful, { makeFetchAdapter } from 'reduxful';
import fetch from 'cross-fetch';

// Make an adapter for Fetch API
const requestAdapter = makeFetchAdapter(fetch);

// Describe a RESTful service as a simple object:
const apiDesc = {
  getDoodad: {
    url: 'http://api.my-service.com/doodads/:doodadId'
  },
  getDoodadList: {
    url: 'http://api.my-service.com/doodads'
  }
};

// Create a Reduxful instance
export default new Reduxful('doodadApi', apiDesc, { requestAdapter });
```

As you can see, setting up and interacting with a RESTful endpoint via Redux is
simple and straightforward with Reduxful. No boilerplate required! Also note,
you don't _have_ to use fetch. If there is another request library you prefer,
as long as you make an adapter for it, it can be used with Reduxful. 

With this Reduxful setup, we can delete our first example setup files. Now let
us see what needs to be updated in our React code to use our new Redux tools
generated by Reduxful.

```diff
// ViewDoodadDetails.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
+ import { isLoaded } from 'reduxful';
+ import { resourceShape } from 'reduxful/react-addons' 

- import { selectDoodad } from './selectors';
- import * as actionCreators from './actionCreators';
+ import doodadApi from './doodadApi';

class ViewDoodadDetails extends Component {

  static propTypes = {
    doodadId: PropTypes.string.isRequired,
    // injected
    getDoodad: PropTypes.func.isRequired,
-    doodad: PropTypes.shape({
-      value: PropTypes.object,
-      isLoaded: PropTypes.bool.isRequired
-    })
+    doodad: resourceShape
  };

  componentDidMount() {
    const { doodadId, getDoodad } = this.props;
    if (doodadId) {
      getDoodad(doodadId);
    }
  }

  componentDidUpdate(prevProps) {
    const { doodadId, getDoodad } = this.props;
    if (doodadId !== prevProps.doodadId) {
      getDoodad(doodadId);
    }
  }

  render() {
    const { doodad } = this.props;
-    if(!doodad || !doodad.isLoaded) {
+    if(!isLoaded(doodad)) {
      return 'Loading doodad details'
    }

    return (
      <code>
        { doodad.value }
      </code>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { doodadId } = ownProps;
  return {
-    doodad: selectDoodad(state, doodadId)
+    doodad: doodadApi.selectors.getDoodad(state, { doodadId })
  }
};

const mapDispatchToProps = {
-  getDoodad: actionCreators.getDoodad
+  getDoodad: doodadApi.actionCreators.getDoodad
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDoodadDetails);
```

```diff
// ViewDoodads.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
+ import { isLoaded } from 'reduxful';
+ import { resourceShape } from 'reduxful/react-addons' 

import ViewDoodadDetails from './ViewDoodadDetails';
- import { selectDoodadList } from './selectors';
- import * as actionCreators from './actionCreators';
+ import doodadApi from './doodadApi';

class ViewDoodads extends Component {

  static propTypes = {
    // injected
    getDoodadList: PropTypes.func.isRequired,
-    doodadList: PropTypes.shape({
-      value: PropTypes.arrayOf(PropTypes.object),
-      isLoaded: PropTypes.bool.isRequired
-    })
+   doodadList: resourceShape
  };

  constructor() {
    super();

    this.state = {
      doodadId: null
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    this.props.getDoodadList();
  }

  handleChange(event) {
    const doodadId = event.target.value;
    this.setState({ doodadId });
  }

  render() {
    const { doodadList } = this.props;
    const { doodadId } = this.state;

-    if(!doodadList || !doodadList.isLoaded) {
+    if(!isLoaded(doodadList)) {
      return 'Loading doodad list...';
    }

    return (
      <div>
        <h4>Select a doodad</h4>
        <select value={ doodadId } onChange={ this.handleChange }>
          { doodadList.value.map(doodad => (
            <option value={ doodad.id }>{ doodad.name }</option>
          )) }
        </select>
        <ViewDoodadDetails doodadId={ doodadId }/>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
-  doodadList: selectDoodadList(state)
  doodadList: doodadApi.selectors.getDoodadList(state)
});

const mapDispatchToProps = {
-  getDoodadList: actionCreators.getDoodadList
  getDoodadList: doodadApi.actionCreators.getDoodadList
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDoodads);
```

```diff
// index.js

import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';

- import reducers from './reducers';
+ import doodadApi from './doodadApi';
import ViewDoodads from './ViewDoodads';

- const rootReducer = combineReducers(reducers)
+ const rootReducer = combineReducers(doodadApi.reducers)
const store = createStore( rootReducer, applyMiddleware(thunk) );

render(
  <Provider store={ store }>
    <ViewDoodads />
  </Provider>,
  document.getElementById('root')
);
```

In our React code, the use of actionCreators and selectors did not really
change, only where they are imported from. The only other changes to note are
that there is a convenience function for checking if a resource `isLoaded`, as
well as a pre-configured `resourceShape` for use with React prop types.

This leads me to talking about resources in Reduxful. A resource is term for
the state object which keeps track of the status of a request and its response.
When a request goes out, a resource is created or updated with an `isUpdating`
property. When the response comes back, the resource will then have either a
`value` or `error` which contains the response body,
and `isLoaded` or `hasError` properties set respectively,
depending on the status of the response.

Most of the time, multiple requests to the same endpoint are needed, yet with
different query or path parameters. As such, resources are keyed in state by an
endpoint's name and the params passed to it. This allows tracking of multiple
requests uniquely.

Besides the generation of Redux tooling around your APIs, Reduxful also handles 
throttling of repeated requests and debouncing in-flight requests, 
along with several other features for working with RESTful data in Redux. 

### From here

This article is not intended to be a tutorial or even a full overview of
Reduxful and its many features. Instead, the goal is to introduce it and its
simplicity to the community. Check out [the docs][reduxful] for more details and
examples. Also, be sure to see the project on GitHub for more complete examples
of how you could use [Reduxful with React][with-react].

#### Additional topics

- [React]
- [Redux]
- [cross-fetch]
- [redux-thunk]


[react]:https://reactjs.org
[redux]:https://redux.js.org
[reduxful]:https://github.com/godaddy/reduxful#readme
[with-react]:https://github.com/godaddy/reduxful/blob/master/docs/react-examples.md#using-with-react
[cross-fetch]:https://github.com/lquixada/cross-fetch#readme
[redux-thunk]:https://github.com/reduxjs/redux-thunk#readme
[react-redux]:https://github.com/reduxjs/react-redux#readme
