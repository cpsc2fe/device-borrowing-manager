import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyBorrowsComponent } from './my-borrows.component';

describe('MyBorrowsComponent', () => {
  let component: MyBorrowsComponent;
  let fixture: ComponentFixture<MyBorrowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyBorrowsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyBorrowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
