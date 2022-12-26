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

async function main() {
  const agent1 = await createAndInitializeAgent("Test Agent one", 5050);
  const agent2 = await createAndInitializeAgent("Test Agent two", 5051);

  const oobRecords = await Promise.all(
    Array(4)
      .fill(null)
      .map(() =>
        agent1.oob.createInvitation({
          autoAcceptConnection: true,
        })
      )
  );

  const connectionRecords = await Promise.all(
    oobRecords.map((oobRecord) =>
      agent2.oob.receiveInvitation(oobRecord.outOfBandInvitation, {
        autoAcceptConnection: true,
      })
    )
  );

  if (connectionRecords.every(({ connectionRecord }) => connectionRecord?.id)) {
    await Promise.all(
      connectionRecords.map(({ connectionRecord }) =>
        agent2.connections.returnWhenIsConnected(connectionRecord?.id || "")
      )
    );
  }

  const connections = await agent1.connections.getAll();
  for (const connection of connections) {
    connection.setTags({
      connectionType: ["test-connection-type-1", "test-connection-type-2"],
    });
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

  if (port) {
    agent.registerInboundTransport(new HttpInboundTransport({ port }));
  }
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
