const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FairWorkEscrow", function () {
  async function setup() {
    const [client, freelancer, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FairWorkEscrow");
    const escrow = await Factory.deploy();
    await escrow.waitForDeployment();
    return { escrow, client, freelancer, outsider };
  }
  const hash = () => ethers.id("fairwork-agreement-v1");

  it("creates a funded deal", async function () {
    const { escrow, client, freelancer } = await setup();
    const amount = ethers.parseEther("0.1");
    await expect(escrow.connect(client).createDeal(freelancer.address, hash(), { value: amount }))
      .to.emit(escrow, "DealCreated");
    const deal = await escrow.getDeal(1);
    expect(deal.client).to.equal(client.address);
    expect(deal.freelancer).to.equal(freelancer.address);
    expect(deal.amount).to.equal(amount);
    expect(deal.status).to.equal(0);
  });

  it("releases funds to freelancer when client approves", async function () {
    const { escrow, client, freelancer } = await setup();
    const amount = ethers.parseEther("0.1");
    await escrow.connect(client).createDeal(freelancer.address, hash(), { value: amount });
    const before = await ethers.provider.getBalance(freelancer.address);
    await expect(escrow.connect(client).release(1)).to.emit(escrow, "FundsReleased");
    const after = await ethers.provider.getBalance(freelancer.address);
    expect(after - before).to.equal(amount);
    expect((await escrow.getDeal(1)).status).to.equal(1);
  });

  it("prevents a third party from releasing funds", async function () {
    const { escrow, client, freelancer, outsider } = await setup();
    await escrow.connect(client).createDeal(freelancer.address, hash(), { value: 1000n });
    await expect(escrow.connect(outsider).release(1)).to.be.revertedWith("Only client");
  });

  it("allows a party to dispute and blocks normal release", async function () {
    const { escrow, client, freelancer } = await setup();
    await escrow.connect(client).createDeal(freelancer.address, hash(), { value: 1000n });
    await expect(escrow.connect(freelancer).raiseDispute(1)).to.emit(escrow, "DisputeRaised");
    await expect(escrow.connect(client).release(1)).to.be.revertedWith("Deal is not funded");
  });

  it("refunds client when no dispute exists", async function () {
    const { escrow, client, freelancer } = await setup();
    const amount = ethers.parseEther("0.05");
    await escrow.connect(client).createDeal(freelancer.address, hash(), { value: amount });
    const before = await ethers.provider.getBalance(client.address);
    const tx = await escrow.connect(client).refund(1);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(client.address);
    expect(after + gas - before).to.equal(amount);
    expect((await escrow.getDeal(1)).status).to.equal(2);
  });
});
