import {
  Agent,
  ConsoleLogger,
  HttpOutboundTransport,
  InitConfig,
  LogLevel,
  MediatorPickupStrategy,
  WsOutboundTransport,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";

const MEDIATOR_URL =
  "https://mediator.dev.animo.id/invite?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiIyMDc1MDM4YS05ZGU3LTRiODItYWUxYi1jNzBmNDg4MjYzYTciLCJsYWJlbCI6IkFuaW1vIE1lZGlhdG9yIiwiYWNjZXB0IjpbImRpZGNvbW0vYWlwMSIsImRpZGNvbW0vYWlwMjtlbnY9cmZjMTkiXSwiaGFuZHNoYWtlX3Byb3RvY29scyI6WyJodHRwczovL2RpZGNvbW0ub3JnL2RpZGV4Y2hhbmdlLzEuMCIsImh0dHBzOi8vZGlkY29tbS5vcmcvY29ubmVjdGlvbnMvMS4wIl0sInNlcnZpY2VzIjpbeyJpZCI6IiNpbmxpbmUtMCIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vbWVkaWF0b3IuZGV2LmFuaW1vLmlkIiwidHlwZSI6ImRpZC1jb21tdW5pY2F0aW9uIiwicmVjaXBpZW50S2V5cyI6WyJkaWQ6a2V5Ono2TWtvSG9RTUphdU5VUE5OV1pQcEw3RGs1SzNtQ0NDMlBpNDJGY3FwR25iampMcSJdLCJyb3V0aW5nS2V5cyI6W119LHsiaWQiOiIjaW5saW5lLTEiLCJzZXJ2aWNlRW5kcG9pbnQiOiJ3c3M6Ly9tZWRpYXRvci5kZXYuYW5pbW8uaWQiLCJ0eXBlIjoiZGlkLWNvbW11bmljYXRpb24iLCJyZWNpcGllbnRLZXlzIjpbImRpZDprZXk6ejZNa29Ib1FNSmF1TlVQTk5XWlBwTDdEazVLM21DQ0MyUGk0MkZjcXBHbmJqakxxIl0sInJvdXRpbmdLZXlzIjpbXX1dfQ";

async function main() {
  const agent1 = await createAndInitializeAgent(
    "Test Agent 1",
    undefined,
    MEDIATOR_URL
  );
  const agent2 = await createAndInitializeAgent("Test Agent 2", 5051);

  /* Generate connections */
  const oobRecord = await agent1.oob.createInvitation({
    autoAcceptConnection: true,
  });

  const { connectionRecord: connection } = await agent2.oob.receiveInvitation(
    oobRecord.outOfBandInvitation,
    {
      autoAcceptConnection: true,
    }
  );

  if (connection?.id) {
    /* Only available in AFJ 0.2.5 onward */
    // await agent2.connections.addConnectionType(connection?.id, `test-agent-1-test-agent-2-connection-1`)
    await agent2.connections.returnWhenIsConnected(connection?.id);
  }

  const connections = await agent1.connections.getAll();
  for (const connection of connections) {
    await agent1.connections.returnWhenIsConnected(connection.id);
  }

  /* Log the connections for Agent 1 */
  agent1.config.logger.debug(
    `${agent1.config.label} Connections: ${JSON.stringify(
      connections,
      null,
      2
    )}`
  );

  await cleanup(agent1);
  await cleanup(agent2);

  process.exit();
}

async function createAndInitializeAgent(
  label: string,
  port?: number,
  url?: string
) {
  const config = {
    label,
    endpoints: port ? [`http://localhost:${port}`] : undefined,
    walletConfig: {
      id: `${label.toLowerCase().replace(/\s/g, "-")}-walletId`,
      key: `${label.toLowerCase().replace(/\s/g, "-")}-walletKey`,
    },
    logger: new ConsoleLogger(LogLevel.debug),
  } as InitConfig;

  if (url) {
    config.mediatorConnectionsInvite = url;
    config.mediatorPickupStrategy = MediatorPickupStrategy.Implicit;
  }

  const agent = new Agent(config, agentDependencies);

  if (port) agent.registerInboundTransport(new HttpInboundTransport({ port }));
  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());

  await agent.initialize();

  agent.config.logger.debug(`${agent.config.label} initialized`);
  return agent;
}

async function cleanup(agent: Agent) {
  await agent.wallet.delete();
  await agent.shutdown();
}

main();
