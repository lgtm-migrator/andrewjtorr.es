import { ApolloProvider } from '@apollo/react-hooks'
import { renderToStringWithData } from '@apollo/react-ssr'
import { ChunkExtractor, ChunkExtractorManager } from '@loadable/server'
import { ServerLocation, isRedirect } from '@reach/router'
import { ApolloServer } from 'apollo-server-express'
import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Express, NextFunction, Request, Response } from 'express'
import { resolve } from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

import { createApolloClient } from './apollo'
import { port } from './config'
import Html from './components/html'
import Root from './components/root'
import schema from './schema'

export interface Context {
  res: Response
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)

  return process.exit(1)
})

const app: Express = express()
const server = new ApolloServer({
  context: ({ res }): Context => ({ res }),
  debug: __IS_DEV__,
  playground: __IS_DEV__,
  schema,
})

app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(compression())
  .use(cors())
  .use(express.static(resolve(__dirname, 'public')))
  .use(server.getMiddleware({ cors: false, path: '/api' }))

app.get('*', async (req: Request, res: Response, next: NextFunction) => {
  const client = createApolloClient({ context: { res }, schema })
  const extractor = new ChunkExtractor({
    entrypoints: 'client',
    statsFile: resolve(__dirname, 'stats.json'),
  })
  const sheet = new ServerStyleSheet()

  try {
    const root = await renderToStringWithData(
      <ChunkExtractorManager extractor={extractor}>
        <StyleSheetManager sheet={sheet.instance}>
          <ServerLocation url={req.url}>
            <ApolloProvider client={client}>
              <Root />
            </ApolloProvider>
          </ServerLocation>
        </StyleSheetManager>
      </ChunkExtractorManager>
    )

    const html = renderToStaticMarkup(
      <Html
        links={extractor.getLinkElements()}
        scripts={extractor.getScriptElements()}
        state={{ __APOLLO_CACHE__: client.extract() }}
        styles={sheet.getStyleElement()}
      >
        {root}
      </Html>
    )

    res.status(200)

    return res.send(`<!doctype html>${html}`)
  } catch (error) {
    return isRedirect(error) ? res.redirect(error.uri) : next(error)
  }
})

if (module.hot) {
  app.hot = module.hot

  module.hot.accept('./components/root')
} else {
  app.listen(port, () =>
    console.info(`The server is running at http://localhost:${port}`)
  )
}

export default app
