import {mine} from "../timeTravel";
import {propose, stake} from "./utils";

contract("BancorGovernance", async (accounts) => {
  const BancorGovernance = artifacts.require("BancorGovernance");
  const TestToken = artifacts.require("TestToken");
  const TestExecutor = artifacts.require("TestExecutor");

  const decimals = 1e18
  const period = 5

  let governance: any;
  let token: any;
  let vote: any;
  let contractToExecute: any;

  const owner = accounts[0]
  const executor = accounts[2]

  before(async () => {
    vote = await TestToken.new()
    token = await TestToken.new()
    contractToExecute = await TestExecutor.new()

    // get the executor some tokens
    await vote.mint(
      executor,
      (100 * decimals).toString()
    )
  })

  beforeEach(async () => {
    governance = await BancorGovernance.new(
      token.address,
      vote.address
    );
  })

  describe("#execute()", async () => {
    it("should be able to execute", async () => {
      // stake
      await stake(
        governance,
        vote,
        executor,
        2
      )
      // lower period so we dot have to mine 17k blocks
      await governance.setPeriod(
        period,
        {from: owner}
      )
      // propose
      const proposalId = await propose(
        governance,
        vote,
        executor,
        contractToExecute.address
      )
      // vote
      await governance.voteFor(
        proposalId,
        {from: executor}
      )
      // mine blocks
      await mine(web3, period)
      // exit
      const {logs, blockNumber} = await governance.execute(
        proposalId,
        {from: executor}
      )
      // check that proposal has completed
      assert.strictEqual(
        logs[0].event,
        "ProposalFinished"
      )
      // check that executor has been executed
      const [executedEvent] = await contractToExecute.getPastEvents(
        "Executed",
        {fromBlock: blockNumber, toBlock: blockNumber}
      );
      // check for event
      assert.exists(executedEvent)
      // check for event type
      assert.strictEqual(
        executedEvent.event,
        "Executed"
      )
      // check for right proposal id
      assert.strictEqual(
        executedEvent.returnValues._id,
        proposalId
      )
    })
  })
})
