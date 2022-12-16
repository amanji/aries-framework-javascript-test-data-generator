import {
  Agent,
  ConsoleLogger,
  HttpOutboundTransport,
  LogLevel,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";

async function main() {
  const agent1 = await createAndInitializeAgent("Test Agent 1", 5050);
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

async function createAndInitializeAgent(label: string, port: number) {
  const agent = new Agent(
    {
      label,
      endpoints: [`http://localhost:${port}`],
      walletConfig: {
        id: `${label.toLowerCase().replace(/\s/g, "-")}-walletId`,
        key: `${label.toLowerCase().replace(/\s/g, "-")}-walletKey`,
      },
      logger: new ConsoleLogger(LogLevel.debug),
    },
    agentDependencies
  );

  agent.registerInboundTransport(new HttpInboundTransport({ port }));
  agent.registerOutboundTransport(new HttpOutboundTransport());

  await agent.initialize();

  agent.config.logger.debug(`${agent.config.label} initialized`);
  return agent;
}

async function cleanup(agent: Agent) {
  await agent.wallet.delete();
  await agent.shutdown();
}

main();
